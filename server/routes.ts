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

    // Generate schedule using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Create a day-by-day schedule between ${req.body.startDate} and ${req.body.endDate} for this goal: ${req.body.title}. ${req.body.description}`;

    const result = await model.generateContent(prompt);
    const schedule = result.response.text().split("\n")
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

  app.post("/api/tasks/:id/validate", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const tasks = await storage.getTasksByGoal(parseInt(req.params.id));
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send("Task not found");

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Validate if this response demonstrates understanding of the task: ${req.body.concept}. Task: ${task.task}`;

    const result = await model.generateContent(prompt);
    const validation = result.response.text();
    const isValid = validation.toLowerCase().includes("correct") || 
                    validation.toLowerCase().includes("demonstrates understanding");

    if (isValid) {
      await storage.updateTask(parseInt(req.params.id), {
        isCompleted: true,
        completionNotes: req.body.concept,
      });
    }

    res.json({ isValid, feedback: validation });
  });

  const httpServer = createServer(app);
  return httpServer;
}