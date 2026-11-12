import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),
  role: text("role", { enum: ["athlete", "coach", "both"] }).notNull().default("athlete"),
  bio: text("bio"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscleGroup: text("muscle_group"),
  isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const workouts = sqliteTable("workouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const workoutExercises = sqliteTable("workout_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer("order_index").notNull().default(0),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workoutExerciseId: integer("workout_exercise_id")
    .notNull()
    .references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  durationSeconds: integer("duration_seconds"),
  notes: text("notes"),
});

export const coachRelationships = sqliteTable("coach_relationships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  coachId: text("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  athleteId: text("athlete_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "declined"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const bodyMetrics = sqliteTable("body_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  weightKg: real("weight_kg"),
  bodyFatPct: real("body_fat_pct"),
  waistCm: real("waist_cm"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Plans — repeating weekly schedule authored by a coach or athlete
export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weeksCount: integer("weeks_count").notNull().default(4),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Sessions within a plan — one per day slot (Day 1, Day 2, ...)
export const planSessions = sqliteTable("plan_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // 1, 2, 3, ...
  name: text("name").notNull(),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
});

// Exercises within a plan session
export const planSessionExercises = sqliteTable("plan_session_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planSessionId: integer("plan_session_id")
    .notNull()
    .references(() => planSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer("order_index").notNull().default(0),
});

// Target sets within a plan session exercise
export const planSessionSets = sqliteTable("plan_session_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planSessionExerciseId: integer("plan_session_exercise_id")
    .notNull()
    .references(() => planSessionExercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  durationSeconds: integer("duration_seconds"),
});

// Athlete enrollment in a plan (self or coach-assigned)
export const athletePlans = sqliteTable("athlete_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  athleteId: text("athlete_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
  startDate: integer("start_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Completed plan days — one row per day a follower marks as done
export const planDayCompletions = sqliteTable("plan_day_completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  athletePlanId: integer("athlete_plan_id")
    .notNull()
    .references(() => athletePlans.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  workoutId: integer("workout_id")
    .references(() => workouts.id, { onDelete: "set null" }),
  completedAt: integer("completed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
