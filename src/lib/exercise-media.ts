import { workouts } from "@/lib/sunrise-data";

/** Reference photos from the original app, keyed by legacy exercise id. */
const map = new Map<string, { image: string; altImage?: string }>();
for (const w of workouts)
  for (const e of w.exercises) map.set(e.id, { image: e.image, altImage: e.altImage });
export const exerciseImage = (legacyId?: string) => (legacyId ? map.get(legacyId) : undefined);
export const workoutImage = (legacyId?: string) => workouts.find((w) => w.id === legacyId)?.image;
