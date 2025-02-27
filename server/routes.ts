import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work correctly.");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

// Bot prompts
const SCHEDULE_BOT_PROMPT = `
You are an AI schedule generator for a learning goal tracking app.
Create a detailed daily schedule between the given dates that will help achieve the learning goal.
Break down the goal into logical, achievable daily tasks.
Each task should build upon previous learning.
Format each task exactly as: YYYY-MM-DD: [specific task description]
`;

const CONCEPT_BOT_PROMPT = `
You are a learning assistant helping users understand concepts and achieve their learning goals.
Your role is to:
- Answer questions about learning concepts
- Provide study tips and strategies
- Help break down complex topics
- Suggest resources for further learning
Do NOT generate schedules - that's handled by a different system.
`;

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/goals", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    let createdGoal;

    try {
      // Validate input
      if (!req.body.title || !req.body.startDate || !req.body.endDate) {
        return res.status(400).json({ message: "Missing required fields: title, startDate, or endDate" });
      }

      // Create goal
      createdGoal = await storage.createGoal({
        ...req.body,
        userId: req.user.id,
      });

      console.log("Goal created:", createdGoal);

      // Generate schedule with Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
        Create a learning schedule between ${req.body.startDate} and ${req.body.endDate} for: ${req.body.title}
        ${req.body.description ? `Additional context: ${req.body.description}` : ''}

        Break down the learning into daily tasks that:
        1. Start with fundamentals
        2. Gradually increase in complexity
        3. Include practical exercises
        4. Are specific and actionable

        Format each task exactly as:
        YYYY-MM-DD: Task description

        Example:
        2025-02-27: Complete Python basics tutorial and write first script
        2025-02-28: Practice Python functions and basic data structures
      `;

      console.log("Sending Gemini prompt:", prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Gemini response:", text);

      // Parse tasks
      const tasks = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'))
        .map(line => {
          const [date, ...taskParts] = line.split(':');
          return {
            date: date.trim(),
            task: taskParts.join(':').trim()
          };
        })
        .filter(task => {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          return dateRegex.test(task.date);
        });

      if (tasks.length === 0) {
        throw new Error('Failed to generate valid tasks');
      }

      console.log("Parsed tasks:", tasks);

      // Create tasks
      const createdTasks = [];
      for (const task of tasks) {
        const newTask = await storage.createTask({
          goalId: createdGoal.id,
          date: task.date,
          task: task.task,
          isCompleted: false,
          completionNotes: null,
        });
        createdTasks.push(newTask);
      }

      console.log("Created tasks:", createdTasks);

      // Send response
      res.json({
        goal: createdGoal,
        tasks: createdTasks
      });

    } catch (error) {
      console.error("Error in goal creation:", error);
      if (createdGoal) {
        // Goal was created but schedule generation failed
        res.status(500).json({
          message: "Goal created but schedule generation failed. Please try again or add tasks manually.",
          goal: createdGoal
        });
      } else {
        // Goal creation failed
        res.status(500).json({
          message: "Failed to create goal. Please try again."
        });
      }
    }
  });

  // Schedule Bot endpoint
  app.post("/api/generate-schedule", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const { title, description, startDate, endDate } = req.body;

      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields: title, startDate, or endDate" });
      }

      // Check if API key is available
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          message: "API key not configured. Please set GEMINI_API_KEY environment variable.",
          fallbackSchedule: generateFallbackSchedule(startDate, endDate, title)
        });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
        Create a daily schedule between ${startDate} and ${endDate} for this learning goal: ${title}
        ${description ? `Context: ${description}` : ''}

        Guidelines:
        1. Create specific, actionable daily tasks
        2. Start with basics and progressively increase complexity
        3. Include practical exercises and assignments
        4. Format each task exactly as: YYYY-MM-DD: [task description]

        Example format:
        2024-02-26: Research basic Python syntax and complete 2 beginner tutorials
        2024-02-27: Practice writing and debugging simple Python scripts
      `;

      console.log("Sending schedule generation prompt:", prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Raw API response:", text);

      const tasks = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'))
        .map(line => {
          const [date, ...taskParts] = line.split(':');
          return {
            date: date.trim(),
            task: taskParts.join(':').trim()
          };
        })
        .filter(task => {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          return dateRegex.test(task.date);
        });

      if (tasks.length === 0) {
        throw new Error('No valid tasks generated from the response');
      }

      console.log("Parsed tasks:", tasks);
      res.json({ tasks });

    } catch (error) {
      console.error("Schedule generation error:", error);
      // Return fallback schedule when API fails
      const { title, startDate, endDate } = req.body;
      res.status(500).json({ 
        message: "Failed to generate schedule. Using fallback schedule.",
        fallbackSchedule: generateFallbackSchedule(startDate, endDate, title)
      });
    }
  });

  // Helper function to generate a fallback schedule when the AI fails
  function generateFallbackSchedule(startDate: string, endDate: string, title: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const tasks = [];
    
    const daysCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDate = new Date(start);
    
    const defaultTasks = [
      "Research basics and fundamental concepts",
      "Complete introductory tutorials",
      "Practice basic exercises",
      "Review previous material and start intermediate concepts",
      "Work on a small project applying what you've learned",
      "Dive into advanced topics",
      "Complete a challenge project",
      "Review all material and identify knowledge gaps"
    ];
    
    for (let i = 0; i < daysCount && i < defaultTasks.length; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      tasks.push({
        date: dateString,
        task: defaultTasks[i] + ` related to ${title}`
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
  }

  // Clear Concept Bot endpoint
  app.post("/api/chat", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      if (!req.body.message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Check if API key is available
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ 
          response: "I'm sorry, but the AI service is not available right now. The administrator needs to set up the GEMINI_API_KEY environment variable. In the meantime, you can try searching online resources or documentation for help with your question."
        });
      }

      const prompt = `
        ${CONCEPT_BOT_PROMPT}

        User's question: ${req.body.message}

        Provide a clear, helpful response that focuses on understanding and learning.
      `;
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ response: text });
    } catch (error) {
      console.error("Chat error:", error);
      res.json({ 
        response: "I'm sorry, but I'm having trouble connecting to the AI service right now. Please try again later, or consider checking documentation or online tutorials for help with your question."
      });
    }
  });


  app.post("/api/tasks/:id/validate", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      if (!req.body.concept) {
        return res.status(400).json({ message: "Concept explanation is required" });
      }

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });

      // Check if API key is available
      let validationResult;
      if (!process.env.GEMINI_API_KEY) {
        // Simple fallback validation - always accept with a notice
        validationResult = {
          isValid: true,
          feedback: "AI validation is not available due to missing API key. Your response has been auto-accepted.",
          conceptsUnderstood: ["self-reported knowledge"],
          conceptsMissing: []
        };
      } else {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const prompt = `
            You are evaluating whether a student has understood a learning task.

            The task was: "${task.task}"

            The student's explanation is: "${req.body.concept}"

            Evaluate the student's explanation and determine if they demonstrate understanding of the key concepts.
            First analyze what key concepts should be understood from the task.
            Then check if the student's explanation addresses these concepts.

            Return your evaluation in JSON format with the following structure:
            {
              "isValid": true/false,
              "feedback": "Your detailed feedback here",
              "conceptsUnderstood": ["list", "of", "concepts", "understood"],
              "conceptsMissing": ["list", "of", "concepts", "missing"]
            }
          `;

          const result = await model.generateContent(prompt);
          const response = await result.response;

          // Parse response or use fallback
          try {
            validationResult = JSON.parse(response.text());
          } catch (e) {
            const text = response.text();
            validationResult = { 
              isValid: true, 
              feedback: "We couldn't fully evaluate your response, but it has been accepted. Keep learning!",
              conceptsUnderstood: [],
              conceptsMissing: []
            };
          }
        } catch (error) {
          // Fallback when API fails
          validationResult = {
            isValid: true,
            feedback: "AI validation service is currently unavailable. Your response has been automatically accepted.",
            conceptsUnderstood: ["self-reported completion"],
            conceptsMissing: []
          };
        }
      }

      if (validationResult.isValid) {
        await storage.updateTask(taskId, {
          isCompleted: true,
          completionNotes: req.body.concept,
        });
      }

      res.json(validationResult);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({ 
        message: "Failed to validate concept. Please try again later.",
        isValid: false 
      });
    }
  });

  app.get("/api/goals", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const goals = await storage.getGoalsByUser(req.user.id);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.get("/api/goals/:id/tasks", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      const tasks = await storage.getTasksByGoal(goalId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
    app.post("/api/goals/:id/tasks", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      // Validate request body
      if (!req.body.date || !req.body.task) {
        return res.status(400).json({ message: "Date and task are required" });
      }

      // Verify the goal belongs to the user
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      if (goal.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to add tasks to this goal" });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(req.body.date)) {
        return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
      }

      // Create the task
      const task = await storage.createTask({
        goalId,
        date: req.body.date,
        task: req.body.task,
        isCompleted: false,
        completionNotes: null,
      });

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.post("/api/goals/:id/bulk-tasks", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      // Validate request body
      if (!Array.isArray(req.body.tasks) || req.body.tasks.length === 0) {
        return res.status(400).json({ message: "Tasks array is required" });
      }

      // Verify the goal belongs to the user
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      if (goal.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to add tasks to this goal" });
      }

      // Validate each task
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const tasks = [];

      for (const taskData of req.body.tasks) {
        if (!taskData.date || !taskData.task) {
          return res.status(400).json({ message: "Each task must have date and task properties" });
        }

        if (!dateRegex.test(taskData.date)) {
          return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
        }

        const task = await storage.createTask({
          goalId,
          date: taskData.date,
          task: taskData.task,
          isCompleted: false,
          completionNotes: null,
        });

        tasks.push(task);
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error creating bulk tasks:", error);
      res.status(500).json({ message: "Failed to create tasks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}