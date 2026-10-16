import { supabase } from "@/lib/supabase";
import { circleMessage } from "./circle";

export type Challenge = {
  id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  title: string;
  unit: string;
  target: number;
  starts_on: string;
  ends_on: string;
  status: "pending" | "active" | "declined" | "closed";
  created_at: string;
  invited_me: boolean;
  mine_progress: number;
  their_progress: number;
};

export type ChallengeEntry = {
  id: string;
  user_id: string;
  display_name: string;
  amount: number;
  note: string | null;
  created_at: string;
  mine: boolean;
};

export type ChallengeDraft = {
  userId: string;
  title: string;
  unit: string;
  target: number;
  endsOn: string;
};

const rpc = async <T>(name: string, params?: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error("Challenges need account services to be configured.");
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(challengeMessage(error));
  return data as T;
};

export function challengeMessage(error: unknown): string {
  const raw = (error as { message?: string })?.message ?? String(error ?? "");
  if (raw.includes("invalid_challenge")) return "Check the title, target and end date.";
  if (raw.includes("challenge_pending")) return "An invitation to this person is already waiting.";
  if (raw.includes("challenge_unavailable")) return "This challenge is no longer available.";
  if (raw.includes("invalid_progress"))
    return "Add between 1 and 10, with a note under 120 characters.";
  if (raw.includes("progress_exceeds_target")) return "That would take you past the target.";
  if (raw.includes("progress_not_found")) return "That check-in is no longer available.";
  return circleMessage(error);
}

export function validateChallenge(draft: ChallengeDraft, today = new Date()): string | null {
  if (!draft.userId) return "Choose a connection.";
  if (!draft.title.trim() || draft.title.trim().length > 60)
    return "Use a title between 1 and 60 characters.";
  if (!draft.unit.trim() || draft.unit.trim().length > 24) return "Name what you are counting.";
  if (!Number.isInteger(draft.target) || draft.target < 1 || draft.target > 100)
    return "Set a target from 1 to 100.";
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(`${draft.endsOn}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 1 || days > 42)
    return "Choose an end date 1 to 42 days away.";
  return null;
}

export const challengeApi = {
  list: () => rpc<Challenge[]>("circle_challenges"),
  entries: (id: string) =>
    rpc<ChallengeEntry[]>("circle_challenge_entries", { p_challenge_id: id }),
  create: (draft: ChallengeDraft) =>
    rpc<string>("circle_challenge_create", {
      p_user_id: draft.userId,
      p_title: draft.title.trim(),
      p_unit: draft.unit.trim(),
      p_target: draft.target,
      p_ends_on: draft.endsOn,
    }),
  respond: (id: string, accept: boolean) =>
    rpc<string>("circle_challenge_respond", { p_challenge_id: id, p_accept: accept }),
  add: (id: string, amount: number, note?: string) =>
    rpc<string>("circle_challenge_add", {
      p_challenge_id: id,
      p_amount: amount,
      p_note: note?.trim() || null,
    }),
  deleteEntry: (id: string) => rpc<void>("circle_challenge_delete_entry", { p_entry_id: id }),
  close: (id: string) => rpc<void>("circle_challenge_close", { p_challenge_id: id }),
};
