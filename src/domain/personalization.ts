import type { CatalogueExercise, EquipmentId, Pattern } from "./catalogue";
import type { PlanInput, Style } from "./planner";
import type { Experience, Goal } from "./programmes";
import type { PlanningProfile } from "@/data/types";

export type PersonalisedPlanDefaults = Pick<
  PlanInput,
  | "goal"
  | "experience"
  | "daysPerWeek"
  | "preferredDays"
  | "sessionMinutes"
  | "style"
  | "avoidPatterns"
  | "excludedExercises"
  | "clinicianRestricted"
> & { rationale: string[] };

const goalMap: Record<PlanningProfile["primaryGoal"], Goal> = {
  "gain-weight": "build_muscle",
  strength: "get_stronger",
  maintain: "general_fitness",
  "lose-weight": "general_fitness",
  custom: "general_fitness",
};
const experienceMap: Record<PlanningProfile["experience"], Experience> = {
  new: "new",
  returning: "returning",
  some: "some",
  experienced: "some",
};

export function styleFor(
  environment: PlanningProfile["environment"],
  equipment: EquipmentId[],
): Style {
  if (
    environment === "outdoors" ||
    equipment.every((item) => item === "bodyweight" || item === "mat")
  )
    return "bodyweight";
  if (equipment.some((item) => item === "machine" || item === "cable")) return "machines_cables";
  if (equipment.some((item) => item === "dumbbell" || item === "barbell" || item === "kettlebell"))
    return "free_weights";
  return "mixed";
}

const phrases = (value: string) =>
  value
    .toLocaleLowerCase("en-GB")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);

export function derivePlanDefaults(
  profile: PlanningProfile,
  equipment: EquipmentId[],
  catalogue: CatalogueExercise[],
): PersonalisedPlanDefaults {
  const lowRecovery =
    profile.physiology?.recovery === "low" ||
    profile.physiology?.energy === "low" ||
    (profile.physiology?.typicalSleepHours != null && profile.physiology.typicalSleepHours < 6);
  const currentVolumeCap =
    profile.physiology?.currentSessionsPerWeek != null
      ? Math.max(2, Math.min(5, profile.physiology.currentSessionsPerWeek + 1))
      : 5;
  const daysPerWeek = Math.max(
    2,
    Math.min(lowRecovery ? 3 : currentVolumeCap, profile.trainingDays.length),
  );
  const chosenDays = profile.trainingDays
    .slice(0, daysPerWeek)
    .map((mondayFirst) => (mondayFirst + 1) % 7);
  const words =
    `${profile.constraints} ${profile.dislikedMovements} ${profile.physiology?.limitations ?? ""}`.toLocaleLowerCase(
      "en-GB",
    );
  const avoidPatterns: Pattern[] = [
    ...(wordMatch(words, /\blunge|step[- ]?up/) ? (["lunge"] as Pattern[]) : []),
    ...(wordMatch(words, /\boverhead|shoulder press/) ? (["push_vertical"] as Pattern[]) : []),
    ...(wordMatch(words, /\bdeadlift|hinge/) ? (["hinge"] as Pattern[]) : []),
    ...(wordMatch(words, /\bsquat|leg press/) ? (["squat"] as Pattern[]) : []),
  ];
  const dislikes = phrases(profile.dislikedMovements);
  const excludedExercises = catalogue
    .filter((exercise) =>
      dislikes.some((term) => exercise.name.toLocaleLowerCase("en-GB").includes(term)),
    )
    .map((exercise) => exercise.id);
  const clinicianRestricted =
    !!profile.physiology?.medicalSafetyFlag ||
    profile.physiology?.ageBand === "under-18" ||
    /\binjur(?:y|ed)|\bpain|surgery|clinician|physio|medical restriction/.test(
      `${profile.constraints} ${profile.physiology?.limitations ?? ""}`.toLocaleLowerCase("en-GB"),
    );
  const sessionMinutes = Math.max(20, Math.min(lowRecovery ? 45 : 120, profile.sessionMinutes));
  return {
    goal: profile.experience === "returning" ? "return_to_routine" : goalMap[profile.primaryGoal],
    experience: experienceMap[profile.experience],
    daysPerWeek,
    preferredDays: chosenDays.length === daysPerWeek ? chosenDays : undefined,
    sessionMinutes,
    style: styleFor(profile.environment, equipment),
    avoidPatterns: [...new Set(avoidPatterns)],
    excludedExercises,
    clinicianRestricted,
    rationale: [
      `${daysPerWeek} sessions fit your ${profile.trainingDays.length} chosen training days.`,
      `Sessions are capped at ${sessionMinutes} minutes.`,
      `${profile.environment} equipment determines which movements are eligible.`,
      ...(avoidPatterns.length || excludedExercises.length
        ? ["Your stated avoidances are filtered before selection."]
        : []),
      ...(profile.experience === "new" || profile.experience === "returning"
        ? ["Volume starts conservatively for your experience."]
        : []),
      ...(lowRecovery
        ? [
            "Your reported sleep or recovery keeps the starting week to at most three shorter sessions; you can reassess later.",
          ]
        : []),
      ...(profile.physiology?.currentSessionsPerWeek != null &&
      profile.trainingDays.length > currentVolumeCap
        ? ["The starting week increases current training frequency by no more than one session."]
        : []),
      ...(clinicianRestricted
        ? [
            "Automatic generation is paused because you disclosed a safety-relevant factor; use guidance from a clinician or qualified trainer.",
          ]
        : []),
    ],
  };
}

const wordMatch = (value: string, pattern: RegExp) => pattern.test(value);
