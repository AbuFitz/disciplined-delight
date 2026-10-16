import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CircleRelationship = "none" | "incoming" | "outgoing" | "connected" | "blocked";
export type CirclePerson = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  relationship: CircleRelationship;
  requested_at?: string;
};
export type CirclePostKind = "training" | "milestone" | "routine" | "food" | "reflection";
export type CirclePost = {
  id: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  kind: CirclePostKind;
  title: string;
  body: string | null;
  metric_label: string | null;
  metric_value: string | null;
  source_date: string | null;
  created_at: string;
  kudos_count: number;
  kudos_mine: boolean;
  mine: boolean;
};
export type CircleDraft = {
  kind: CirclePostKind;
  title: string;
  body?: string;
  metricLabel?: string;
  metricValue?: string;
  sourceDate?: string;
};

const rpc = async <T>(name: string, params?: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error("Circle needs account services to be configured.");
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(circleMessage(error));
  return data as T;
};

export function circleMessage(error: unknown): string {
  const raw = (error as { message?: string })?.message ?? String(error ?? "");
  if (raw.includes("profile_required")) return "Finish your profile before using Circle.";
  if (raw.includes("person_not_found")) return "That person could not be found.";
  if (raw.includes("connection_unavailable")) return "That connection is unavailable.";
  if (raw.includes("request_not_found")) return "That request is no longer waiting.";
  if (raw.includes("invalid_post")) return "Check the post length and try again.";
  if (/network|fetch/i.test(raw)) return "You're offline. Circle will be here when you reconnect.";
  return raw || "Circle could not update. Try again.";
}

export function validateCircleDraft(draft: CircleDraft): string | null {
  const title = draft.title.trim();
  if (!title) return "Add a short title.";
  if (title.length > 80) return "Keep the title to 80 characters.";
  if ((draft.body ?? "").length > 500) return "Keep the note to 500 characters.";
  if ((draft.metricLabel ?? "").length > 40 || (draft.metricValue ?? "").length > 40)
    return "Keep the highlight fields to 40 characters.";
  return null;
}

export const circleApi = {
  connections: () => rpc<CirclePerson[]>("circle_my_connections"),
  blocks: () => rpc<CirclePerson[]>("circle_my_blocks"),
  find: (query: string) => rpc<CirclePerson[]>("circle_find_people", { p_query: query.trim() }),
  sendRequest: (userId: string) =>
    rpc<CircleRelationship>("circle_send_request", { p_user_id: userId }),
  respond: (userId: string, accept: boolean) =>
    rpc<CircleRelationship | "removed">("circle_respond_request", {
      p_user_id: userId,
      p_accept: accept,
    }),
  remove: (userId: string) => rpc<void>("circle_remove_connection", { p_user_id: userId }),
  block: (userId: string) => rpc<void>("circle_block", { p_user_id: userId }),
  unblock: (userId: string) => rpc<void>("circle_unblock", { p_user_id: userId }),
  feed: () => rpc<CirclePost[]>("circle_feed", { p_before: null, p_limit: 30 }),
  async share(draft: CircleDraft): Promise<string> {
    const invalid = validateCircleDraft(draft);
    if (invalid) throw new Error(invalid);
    return rpc<string>("circle_share", {
      p_kind: draft.kind,
      p_title: draft.title.trim(),
      p_body: draft.body?.trim() || null,
      p_metric_label: draft.metricLabel?.trim() || null,
      p_metric_value: draft.metricValue?.trim() || null,
      p_source_date: draft.sourceDate || null,
    });
  },
  deletePost: (postId: string) => rpc<void>("circle_delete_post", { p_post_id: postId }),
  toggleKudos: (postId: string) => rpc<boolean>("circle_toggle_kudos", { p_post_id: postId }),
};

type CircleState = {
  loading: boolean;
  error: string | null;
  connections: CirclePerson[];
  blocks: CirclePerson[];
  posts: CirclePost[];
};

export function useCircle(enabled: boolean) {
  const [state, setState] = useState<CircleState>({
    loading: enabled,
    error: null,
    connections: [],
    blocks: [],
    posts: [],
  });
  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({ loading: false, error: null, connections: [], blocks: [], posts: [] });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [connections, blocks, posts] = await Promise.all([
        circleApi.connections(),
        circleApi.blocks(),
        circleApi.feed(),
      ]);
      setState({ loading: false, error: null, connections, blocks, posts });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: circleMessage(error) }));
    }
  }, [enabled]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { ...state, refresh };
}
