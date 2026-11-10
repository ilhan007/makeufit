import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["strength", "cardio", "flexibility", "other"]),
  muscleGroup: z.string().optional(),
});

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

export const addSetSchema = z.object({
  exerciseId: z.number().int().positive(),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const createMetricsSchema = z.object({
  date: z.string().datetime(),
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  chestCm: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  hipsCm: z.number().positive().optional(),
  armsCm: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});
