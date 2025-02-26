import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with the correct API version
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/goals", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    let createdGoal;

    try {
      // Validate input data
      if (!req.body.title || !req.body.startDate || !req.body.endDate) {
        return res.status(400).json({ message: "Missing required fields: title, startDate, or endDate" });
      }

      console.log("Creating goal with data:", req.body);

      // Create goal first
      createdGoal = await storage.createGoal({
        ...req.body,
        userId: req.user.id,
      });

      console.log("Goal created successfully:", createdGoal);

      try {
        // Generate schedule using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
          Create a schedule for learning ${req.body.title} between ${req.body.startDate} and ${req.body.endDate}.
          ${req.body.description ? `Additional context: ${req.body.description}` : ''}

          Break down the learning into daily tasks.
          Format each task as:
          YYYY-MM-DD: [task description]

          Example:
          2025-02-26: Set up Python development environment
          2025-02-27: Complete basic Python syntax tutorial
        `;

        console.log("Sending prompt to Gemini:", prompt);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini response:", text);

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
          throw new Error('No valid tasks generated');
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

        res.json({ 
          goal: createdGoal, 
          tasks: createdTasks 
        });

      } catch (aiError) {
        console.error("AI Schedule generation error:", aiError);
        res.status(500).json({
          message: "Failed to generate schedule, but goal was created. Please try adding tasks manually.",
          goal: createdGoal
        });
      }

    } catch (error) {
      console.error("Goal creation error:", error);
      res.status(500).json({
        message: "Failed to create goal"
      });
    }
  });

  // Chat endpoint for Clear Concept Bot
  app.post("/api/chat", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      if (!req.body.message) {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log("Chat request:", req.body.message);

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const prompt = `
        As a learning assistant focused on goal tracking and learning, help the user with this question: 
        ${req.body.message}

        Provide a clear, helpful response that encourages learning and progress tracking.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Chat response:", text);

      res.json({ response: text });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        message: "Failed to process your question. Please try again later."
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

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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

      // Try to parse the JSON response
      let validationResult;
      try {
        validationResult = JSON.parse(response.text());
      } catch (e) {
        // Fallback if JSON parsing fails
        const text = response.text();
        const isValid = text.toLowerCase().includes("correct") || 
                      text.toLowerCase().includes("demonstrates understanding") ||
                      text.toLowerCase().includes("understood");

        validationResult = { 
          isValid, 
          feedback: text,
          conceptsUnderstood: [],
          conceptsMissing: []
        };
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

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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

      // Try to parse the JSON response
      let validationResult;
      try {
        validationResult = JSON.parse(response.text());
      } catch (e) {
        // Fallback if JSON parsing fails
        const text = response.text();
        const isValid = text.toLowerCase().includes("correct") || 
                      text.toLowerCase().includes("demonstrates understanding") ||
                      text.toLowerCase().includes("understood");

        validationResult = { 
          isValid, 
          feedback: text,
          conceptsUnderstood: [],
          conceptsMissing: []
        };
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