import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type ServerProfile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  timezone: string;
};

export type ProfileError =
  | "username_taken"
  | "username_reserved"
  | "invalid_username"
  | "profile_exists"
  | "other";

export class ProfileApiError extends Error {
  constructor(
    public code: ProfileError,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const toError = (e: { message?: string } | null): ProfileApiError => {
  const m = e?.message ?? "";
  const code = (
    ["username_taken", "username_reserved", "invalid_username", "profile_exists"] as const
  ).find((c) => m.includes(c));
  return new ProfileApiError(code ?? "other", m);
};

export const profileApi = {
  async mine(): Promise<ServerProfile | null> {
    const { data, error } = await supabase!.rpc("my_profile");
    if (error) throw toError(error);
    return (data as ServerProfile | null) ?? null;
  },
  async available(username: string): Promise<boolean> {
    const { data, error } = await supabase!.rpc("username_available", { p_username: username });
    if (error) throw toError(error);
    return data === true;
  },
  async create(username: string, displayName: string, timezone: string): Promise<ServerProfile> {
    const { data, error } = await supabase!.rpc("create_profile", {
      p_username: username,
      p_display_name: displayName,
      p_timezone: timezone,
    });
    if (error) throw toError(error);
    return data as ServerProfile;
  },
  async update(p: {
    displayName?: string;
    timezone?: string;
    username?: string;
  }): Promise<ServerProfile> {
    const { data, error } = await supabase!.rpc("update_profile", {
      p_display_name: p.displayName ?? null,
      p_timezone: p.timezone ?? null,
      p_avatar_path: null,
      p_username: p.username ?? null,
    });
    if (error) throw toError(error);
    return data as ServerProfile;
  },
};

/* ---- Observable "do I have a profile?" state, per signed-in user ---- */
export type ProfileState =
  | { status: "none" } // guest or accounts not configured
  | { status: "loading"; userId: string }
  | { status: "missing"; userId: string } // signed in, positively no profile yet → onboarding
  | { status: "ready"; userId: string; profile: ServerProfile }
  | { status: "error"; userId: string; message: string }; // e.g. offline: don't force onboarding

let state: ProfileState = { status: "none" };
const subs = new Set<() => void>();
const setState = (s: ProfileState) => {
  state = s;
  subs.forEach((f) => f());
};
let inflight: string | null = null;

async function load(userId: string) {
  if (inflight === userId) return;
  inflight = userId;
  setState({ status: "loading", userId });
  try {
    const p = await profileApi.mine();
    if (inflight !== userId) return; // the account changed while we asked
    setState(p ? { status: "ready", userId, profile: p } : { status: "missing", userId });
  } catch (e) {
    if (inflight === userId) setState({ status: "error", userId, message: (e as Error).message });
  } finally {
    if (inflight === userId) inflight = null;
  }
}

export function setReadyProfile(userId: string, profile: ServerProfile) {
  setState({ status: "ready", userId, profile });
}

/** Tracks the signed-in account's server profile. Resets immediately when the account changes. */
export function useAccountProfile() {
  const { user, loading } = useAuth();
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
    () => state,
  );
  const userId = user?.id;
  useEffect(() => {
    if (loading) return;
    if (!supabase || !userId) {
      inflight = null;
      if (state.status !== "none") setState({ status: "none" });
      return;
    }
    if ("userId" in state && state.userId === userId && state.status !== "error") return;
    void load(userId);
  }, [userId, loading]);
  const refresh = useCallback(() => {
    if (userId) {
      inflight = null;
      void load(userId);
    }
  }, [userId]);
  // Never expose another account's profile for even a frame.
  const current: ProfileState =
    userId && "userId" in s && s.userId === userId
      ? s
      : userId
        ? { status: "loading", userId }
        : { status: "none" };
  return { state: current, refresh };
}
