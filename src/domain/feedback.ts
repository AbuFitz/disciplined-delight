export const FEEDBACK_CATEGORIES = [
  "bug",
  "exercise_media",
  "accessibility",
  "account_sync",
  "feature",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type SafeDiagnostics = {
  appVersion: string;
  route: string;
  platform: string;
  online: boolean;
  syncMode: string;
  errorIds: string[];
};
export type FeedbackPayload = {
  reference: string;
  createdAt: string;
  category: FeedbackCategory;
  description: string;
  contactEmail?: string;
  screenshot?: { name: string; type: string; size: number };
  /** Only present when the person ticked the embed consent box. */
  screenshotData?: string;
  diagnostics?: SafeDiagnostics;
};

const allowed = new Set(FEEDBACK_CATEGORIES);
export function validateFeedback(
  value: Omit<FeedbackPayload, "reference" | "createdAt">,
): string[] {
  const errors: string[] = [];
  if (!allowed.has(value.category)) errors.push("Choose a valid category.");
  if (value.description.trim().length < 20)
    errors.push("Describe what happened in at least 20 characters.");
  if (value.description.length > 4000) errors.push("Keep the description under 4,000 characters.");
  if (value.contactEmail && !/^\S+@\S+\.\S+$/.test(value.contactEmail))
    errors.push("Enter a valid contact email or leave it blank.");
  if (
    value.screenshot &&
    (!value.screenshot.type.startsWith("image/") || value.screenshot.size > 10 * 1024 * 1024)
  )
    errors.push("Use an image under 10 MB.");
  return errors;
}

/** Allowlist only. Unknown diagnostic fields are deliberately discarded. */
export function safeDiagnostics(input: Record<string, unknown>): SafeDiagnostics {
  return {
    appVersion: String(input.appVersion ?? "unknown").slice(0, 80),
    route: String(input.route ?? "/")
      .split(/[?#]/)[0]!
      .slice(0, 180),
    platform: String(input.platform ?? "unknown").slice(0, 240),
    online: input.online === true,
    syncMode: String(input.syncMode ?? "unknown").slice(0, 40),
    errorIds: Array.isArray(input.errorIds)
      ? input.errorIds
          .map(String)
          .filter((item) => /^[A-Z0-9_-]{3,64}$/i.test(item))
          .slice(0, 10)
      : [],
  };
}

export const feedbackReference = (now = new Date(), random = Math.random()) =>
  `VY-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(random * 36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, "0")}`;
