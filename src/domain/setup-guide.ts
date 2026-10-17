export type SetupGuideContext = {
  modules: string[];
  safetyGate: boolean;
  days: number;
  minutes: number;
};
const guides = [
  [
    "Your basics",
    "Timezone anchors Today, Plan and quiet hours. A display name is optional for guests.",
  ],
  [
    "One connected space",
    "Your area choices change navigation and which signals feed Today. Nothing is locked in.",
  ],
  [
    "No assumptions",
    "Faith tools appear only after an explicit choice. Skipping keeps them completely off.",
  ],
  [
    "Fit before intensity",
    "Days, available time, equipment and avoidances change the actual programme candidates.",
  ],
  ["Protect real life", "Work, sleep and quiet windows keep schedules and prompts context-aware."],
  [
    "Preview before saving",
    "Review the reasons, go back to change anything, or edit it later in Settings.",
  ],
] as const;
export function setupGuide(step: number, context: SetupGuideContext) {
  const [title, body] = guides[Math.max(0, Math.min(guides.length - 1, step))]!;
  if (step === 5 && context.safetyGate)
    return {
      title: "Automatic planning will pause",
      body: "A safety-relevant answer means VAYVOR will not guess. Save your preferences, then use guidance from a clinician or qualified trainer.",
    };
  if (step === 5)
    return {
      title,
      body: `${body} Current fit: ${context.days} days, up to ${context.minutes} minutes, across ${context.modules.length} selected areas.`,
    };
  return { title, body };
}
