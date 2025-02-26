import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/goals", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const goal = await storage.createGoal({
      ...req.body,
      userId: req.user.id,
    });

    try {
      // Generate schedule using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const prompt = `Create a day-by-day schedule between ${req.body.startDate} and ${req.body.endDate} for this goal: ${req.body.title}. ${req.body.description}. Format each line as 'YYYY-MM-DD: task description'`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const schedule = response.text().split("\n")
        .filter(line => line.trim())
        .map(line => {
          const [date, task] = line.split(":");
          return { date: date.trim(), task: task.trim() };
        });

      // Create tasks from schedule
      for (const item of schedule) {
        await storage.createTask({
          goalId: goal.id,
          date: item.date,
          task: item.task,
          isCompleted: false,
          completionNotes: null,
        });
      }

      res.json(goal);
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ 
        message: "Failed to generate schedule, but goal was created. Please try adding tasks manually.",
        goal 
      });
    }
  });

  app.get("/api/goals", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const goals = await storage.getGoalsByUser(req.user.id);
    res.json(goals);
  });

  app.get("/api/goals/:id/tasks", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const tasks = await storage.getTasksByGoal(parseInt(req.params.id));
    res.json(tasks);
  });

  // Add chat endpoint for Clear Concept Bot
  app.post("/api/chat", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const prompt = `As a learning assistant for a goal tracking app, help the user with this question: ${req.body.message}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ response: response.text() });
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ 
        message: "Failed to process your question. Please try again later."
      });
    }
  });

  app.post("/api/tasks/:id/validate", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const tasks = await storage.getTasksByGoal(parseInt(req.params.id));
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send("Task not found");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const prompt = `Validate if this response demonstrates understanding of the task: ${req.body.concept}. Task: ${task.task}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const validation = response.text();
      const isValid = validation.toLowerCase().includes("correct") || 
                    validation.toLowerCase().includes("demonstrates understanding");

      if (isValid) {
        await storage.updateTask(parseInt(req.params.id), {
          isCompleted: true,
          completionNotes: req.body.concept,
        });
      }

      res.json({ isValid, feedback: validation });
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ 
        message: "Failed to validate concept. Please try again later.",
        isValid: false 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}