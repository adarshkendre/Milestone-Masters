import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  streak: integer("streak").default(0).notNull(),
  activeDays: integer("active_days").default(0).notNull(),
  missingDays: integer("missing_days").default(0).notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  date: date("date").notNull(),
  task: text("task").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completionNotes: text("completion_notes"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertGoalSchema = createInsertSchema(goals).pick({
  title: true,
  description: true,
  startDate: true,
  endDate: true,
});

export const insertTaskSchema = createInsertSchema(tasks);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
