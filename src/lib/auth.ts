import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * One shared auth store (a single Supabase subscription for the whole app).
 * `loading` stays true until Supabase has reported the stored session, so nothing guesses a scope early.
 */
export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  /** True after a password-recovery link was opened: the user must set a new password. */
  recovery: boolean;
};

let state: AuthState = { loading: !!supabase, session: null, user: null, recovery: false };
const subs = new Set<() => void>();
const set = (p: Partial<AuthState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

let started = false;
function start() {
  if (started || !supabase || typeof window === "undefined") return;
  started = true;
  const sb = supabase;
  void sb.auth.getSession().then(({ data }) => {
    set({ loading: false, session: data.session, user: data.session?.user ?? null });
  });
  sb.auth.onAuthStateChange((event, session) => {
    set({
      loading: false,
      session,
      user: session?.user ?? null,
      recovery:
        event === "PASSWORD_RECOVERY" ? true : event === "SIGNED_OUT" ? false : state.recovery,
    });
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (f) => {
      start();
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
    () => state,
  );
}
/** Back-compat alias. */
export const useSession = useAuth;

const origin = () => window.location.origin;
export const CALLBACK_PATH = "/auth/callback";
export const RESET_PATH = "/auth/reset";

const need = () => {
  if (!supabase) throw new Error("Accounts aren't set up in this build.");
  return supabase;
};

export const MIN_PASSWORD = 8;

export const authApi = {
  async signIn(email: string, password: string) {
    const { error } = await need().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  },
  /** Returns whether the person must confirm their email before a session exists. */
  async signUp(email: string, password: string) {
    const { data, error } = await need().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${origin()}${CALLBACK_PATH}` },
    });
    if (error) throw error;
    // With "Confirm email" on, Supabase returns a user without a session. An already-registered address
    // returns a user with no identities and sends nothing, so don't claim a mail was sent in that case.
    const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0;
    return { needsConfirmation: !data.session, alreadyRegistered };
  },
  async resendConfirmation(email: string) {
    const { error } = await need().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${origin()}${CALLBACK_PATH}` },
    });
    if (error) throw error;
  },
  async signInWithGoogle() {
    const { error } = await need().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin()}${CALLBACK_PATH}` },
    });
    if (error) throw error;
  },
  async requestPasswordReset(email: string) {
    const { error } = await need().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin()}${RESET_PATH}`,
    });
    if (error) throw error;
  },
  async updatePassword(password: string) {
    const { error } = await need().auth.updateUser({ password });
    if (error) throw error;
    set({ recovery: false });
  },
  async signOut() {
    if (supabase) await supabase.auth.signOut();
  },
};

/** Friendly text for the errors people actually hit. */
export function authMessage(e: unknown): string {
  const m = (e as { message?: string; code?: string })?.message ?? "";
  const code = (e as { code?: string })?.code ?? "";
  if (code === "email_not_confirmed" || /not confirmed/i.test(m))
    return "Confirm your email first. We can send the link again.";
  if (code === "invalid_credentials" || /invalid login/i.test(m))
    return "That email and password don't match.";
  if (code === "over_email_send_rate_limit" || /rate limit|too many/i.test(m))
    return "Too many emails sent. Wait a minute and try again.";
  if (code === "weak_password" || (/password/i.test(m) && /characters|weak/i.test(m)))
    return "Choose a longer, less common password (at least 8 characters).";
  if (code === "otp_expired" || /expired|invalid/i.test(m))
    return "That link has expired or was already used.";
  if (/network|fetch/i.test(m)) return "You're offline or the service can't be reached.";
  return m || "Something went wrong. Try again.";
}
