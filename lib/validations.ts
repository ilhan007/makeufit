import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["strength", "cardio", "flexibility", "other"]),
  muscleGroup: z.enum(["chest", "back", "legs", "shoulders", "arms", "core", "full_body"]).optional(),
  isBuiltin: z.boolean().optional(),
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
  waistCm: z.number().positive().optional(),
});

export const coachRequestSchema = z.object({
  coachId: z.string().min(1),
});

export const coachRequestStatusSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
  exercises: z.array(z.object({
    exerciseId: z.number().int().positive(),
    sets: z.array(z.object({
      setNumber: z.number().int().positive(),
      reps: z.number().int().positive().optional(),
      weightKg: z.number().positive().optional(),
      durationSeconds: z.number().int().positive().optional(),
    })),
  })),
});

export const assignTemplateSchema = z.object({
  athleteId: z.string().min(1),
});

