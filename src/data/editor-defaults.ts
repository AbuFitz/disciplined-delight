import { newId } from "./db";
import type { WorkoutTemplate } from "./types";

export const blankTemplate = (order: number): WorkoutTemplate => ({
  id: newId(),
  letter: String.fromCharCode(65 + (order % 26)),
  title: "",
  focus: "",
  weekday: null,
  exercises: [],
  order,
});
