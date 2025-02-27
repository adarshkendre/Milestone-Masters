import type { User, InsertUser, Goal, InsertGoal, Task, InsertTask } from "@shared/schema";
import { users, goals, tasks } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(userId: number, stats: Partial<User>): Promise<User>;

  createGoal(goal: InsertGoal & { userId: number }): Promise<Goal>;
  getGoalsByUser(userId: number): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByGoal(goalId: number): Promise<Task[]>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    console.log("Initializing PostgreSQL session store...");
    try {
      this.sessionStore = new PostgresSessionStore({
        pool,
        createTableIfMissing: true,
      });
      console.log("PostgreSQL session store initialized successfully");
    } catch (error) {
      console.error("Failed to initialize PostgreSQL session store:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUserStats(userId: number, stats: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error updating user stats for user ${userId}:`, error);
      throw error;
    }
  }

  async createGoal(goal: InsertGoal & { userId: number }): Promise<Goal> {
    try {
      const [newGoal] = await db.insert(goals).values(goal).returning();
      return newGoal;
    } catch (error) {
      console.error("Error creating goal:", error);
      throw error;
    }
  }

  async getGoalsByUser(userId: number): Promise<Goal[]> {
    try {
      return db.select().from(goals).where(eq(goals.userId, userId));
    } catch (error) {
      console.error(`Error fetching goals for user ${userId}:`, error);
      throw error;
    }
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    try {
      const [goal] = await db.select().from(goals).where(eq(goals.id, id));
      return goal;
    } catch (error) {
      console.error(`Error fetching goal ${id}:`, error);
      throw error;
    }
  }

  async createTask(task: InsertTask): Promise<Task> {
    try {
      const [newTask] = await db.insert(tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
      return task;
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      throw error;
    }
  }

  async getTasksByGoal(goalId: number): Promise<Task[]> {
    try {
      return db.select().from(tasks).where(eq(tasks.goalId, goalId));
    } catch (error) {
      console.error(`Error fetching tasks for goal ${goalId}:`, error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    try {
      const [task] = await db
        .update(tasks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return task;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();