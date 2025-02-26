import type { User, InsertUser, Goal, InsertGoal, Task, InsertTask } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private goals: Map<number, Goal>;
  private tasks: Map<number, Task>;
  sessionStore: session.Store;
  private currentUserId: number = 1;
  private currentGoalId: number = 1;
  private currentTaskId: number = 1;

  constructor() {
    this.users = new Map();
    this.goals = new Map();
    this.tasks = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      streak: 0,
      activeDays: 0,
      missingDays: 0,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStats(userId: number, stats: Partial<User>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...stats };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createGoal(goal: InsertGoal & { userId: number }): Promise<Goal> {
    const id = this.currentGoalId++;
    const newGoal: Goal = {
      ...goal,
      id,
      createdAt: new Date(),
    };
    this.goals.set(id, newGoal);
    return newGoal;
  }

  async getGoalsByUser(userId: number): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(
      (goal) => goal.userId === userId,
    );
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const newTask: Task = {
      ...task,
      id,
      isCompleted: false,
      completionNotes: null,
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByGoal(goalId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.goalId === goalId,
    );
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
}

export const storage = new MemStorage();