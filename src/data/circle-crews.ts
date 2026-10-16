import { supabase } from "@/lib/supabase";
import { circleMessage } from "./circle";

export type CrewRole = "owner" | "member";
export type CrewMemberStatus = "pending" | "active" | "declined" | "left" | "removed";
export type CrewCheckinState = "showed_up" | "adjusted" | "rested";

export type Crew = {
  id: string;
  name: string;
  purpose: string;
  owner_id: string;
  owner_username: string;
  owner_display_name: string;
  my_role: CrewRole;
  my_status: CrewMemberStatus;
  active_count: number;
  pending_count: number;
  created_at: string;
  updated_at: string;
};

export type CrewMember = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  role: CrewRole;
  status: CrewMemberStatus;
  mine: boolean;
  joined_at: string | null;
};

export type CrewCheckin = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  state: CrewCheckinState;
  note: string | null;
  week_on: string;
  mine: boolean;
  updated_at: string;
};

export type CrewDraft = { name: string; purpose: string; inviteeIds: string[] };
export type CrewCheckinDraft = { state: CrewCheckinState; note: string };

const rpc = async <T>(name: string, params?: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error("Crews need account services to be configured.");
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(crewMessage(error));
  return data as T;
};

export function crewMessage(error: unknown): string {
  const raw = (error as { message?: string })?.message ?? String(error ?? "");
  if (raw.includes("invalid_crew")) return "Check the crew name, purpose and invitation list.";
  if (raw.includes("crew_full")) return "This crew already has twelve active or invited people.";
  if (raw.includes("crew_unavailable")) return "This crew is no longer available.";
  if (raw.includes("crew_owner_required")) return "Only the crew owner can do that.";
  if (raw.includes("member_unavailable")) return "That crew member is no longer available.";
  if (raw.includes("invalid_checkin"))
    return "Choose a roll-call state and keep the note under 180 characters.";
  return circleMessage(error);
}

export function validateCrewDraft(draft: CrewDraft): string | null {
  const name = draft.name.trim();
  const purpose = draft.purpose.trim();
  if (name.length < 3 || name.length > 40) return "Use a crew name between 3 and 40 characters.";
  if (purpose.length < 10 || purpose.length > 160)
    return "Describe the crew's purpose in 10 to 160 characters.";
  if (new Set(draft.inviteeIds).size !== draft.inviteeIds.length)
    return "Each connection can be invited once.";
  if (draft.inviteeIds.length > 11) return "A crew can have at most twelve people including you.";
  return null;
}

export function validateCrewCheckin(draft: CrewCheckinDraft): string | null {
  if (!(["showed_up", "adjusted", "rested"] as string[]).includes(draft.state))
    return "Choose a roll-call state.";
  if (draft.note.trim().length > 180) return "Keep the roll-call note to 180 characters.";
  return null;
}

export const crewApi = {
  list: () => rpc<Crew[]>("circle_crews"),
  members: (crewId: string) => rpc<CrewMember[]>("circle_crew_members", { p_crew_id: crewId }),
  checkins: (crewId: string) => rpc<CrewCheckin[]>("circle_crew_checkins", { p_crew_id: crewId }),
  create: (draft: CrewDraft) =>
    rpc<string>("circle_crew_create", {
      p_name: draft.name.trim(),
      p_purpose: draft.purpose.trim(),
      p_invitee_ids: draft.inviteeIds,
    }),
  respond: (crewId: string, accept: boolean) =>
    rpc<CrewMemberStatus>("circle_crew_respond", { p_crew_id: crewId, p_accept: accept }),
  invite: (crewId: string, userId: string) =>
    rpc<void>("circle_crew_invite", { p_crew_id: crewId, p_user_id: userId }),
  removeMember: (crewId: string, userId: string) =>
    rpc<void>("circle_crew_remove_member", { p_crew_id: crewId, p_user_id: userId }),
  leave: (crewId: string) => rpc<void>("circle_crew_leave", { p_crew_id: crewId }),
  archive: (crewId: string) => rpc<void>("circle_crew_archive", { p_crew_id: crewId }),
  checkin: (crewId: string, draft: CrewCheckinDraft) =>
    rpc<string>("circle_crew_checkin", {
      p_crew_id: crewId,
      p_state: draft.state,
      p_note: draft.note.trim() || null,
    }),
  deleteCheckin: (crewId: string) => rpc<void>("circle_crew_checkin_delete", { p_crew_id: crewId }),
};
