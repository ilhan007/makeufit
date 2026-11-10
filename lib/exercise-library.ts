export type ExerciseEntry = {
  name: string;
  category: "strength" | "cardio" | "flexibility" | "other";
  muscleGroup: string;
};

export const EXERCISE_LIBRARY: ExerciseEntry[] = [
  // Chest
  { name: "Bench Press", category: "strength", muscleGroup: "chest" },
  { name: "Incline Bench Press", category: "strength", muscleGroup: "chest" },
  { name: "Dumbbell Fly", category: "strength", muscleGroup: "chest" },
  { name: "Push-Up", category: "strength", muscleGroup: "chest" },
  { name: "Cable Crossover", category: "strength", muscleGroup: "chest" },
  // Back
  { name: "Deadlift", category: "strength", muscleGroup: "back" },
  { name: "Barbell Row", category: "strength", muscleGroup: "back" },
  { name: "Pull-Up", category: "strength", muscleGroup: "back" },
  { name: "Lat Pulldown", category: "strength", muscleGroup: "back" },
  { name: "Seated Cable Row", category: "strength", muscleGroup: "back" },
  { name: "T-Bar Row", category: "strength", muscleGroup: "back" },
  // Legs
  { name: "Squat", category: "strength", muscleGroup: "legs" },
  { name: "Front Squat", category: "strength", muscleGroup: "legs" },
  { name: "Leg Press", category: "strength", muscleGroup: "legs" },
  { name: "Romanian Deadlift", category: "strength", muscleGroup: "legs" },
  { name: "Lunges", category: "strength", muscleGroup: "legs" },
  { name: "Leg Curl", category: "strength", muscleGroup: "legs" },
  { name: "Leg Extension", category: "strength", muscleGroup: "legs" },
  { name: "Calf Raise", category: "strength", muscleGroup: "legs" },
  // Shoulders
  { name: "Overhead Press", category: "strength", muscleGroup: "shoulders" },
  { name: "Arnold Press", category: "strength", muscleGroup: "shoulders" },
  { name: "Lateral Raise", category: "strength", muscleGroup: "shoulders" },
  { name: "Front Raise", category: "strength", muscleGroup: "shoulders" },
  { name: "Face Pull", category: "strength", muscleGroup: "shoulders" },
  { name: "Upright Row", category: "strength", muscleGroup: "shoulders" },
  // Arms
  { name: "Barbell Curl", category: "strength", muscleGroup: "arms" },
  { name: "Hammer Curl", category: "strength", muscleGroup: "arms" },
  { name: "Tricep Pushdown", category: "strength", muscleGroup: "arms" },
  { name: "Skull Crushers", category: "strength", muscleGroup: "arms" },
  { name: "Dips", category: "strength", muscleGroup: "arms" },
  // Core
  { name: "Plank", category: "strength", muscleGroup: "core" },
  { name: "Ab Wheel", category: "strength", muscleGroup: "core" },
  { name: "Cable Crunch", category: "strength", muscleGroup: "core" },
  { name: "Hanging Leg Raise", category: "strength", muscleGroup: "core" },
  // Cardio
  { name: "Running", category: "cardio", muscleGroup: "full_body" },
  { name: "Cycling", category: "cardio", muscleGroup: "full_body" },
  { name: "Rowing", category: "cardio", muscleGroup: "full_body" },
  { name: "Jump Rope", category: "cardio", muscleGroup: "full_body" },
  { name: "Stair Climber", category: "cardio", muscleGroup: "full_body" },
];
