import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AuthState = { loading: boolean; session: Session | null; user: Session["user"] | null };

/** Auth is optional. `loading` is true until Supabase has reported the stored session, so callers never guess a scope early. */
export function useSession() {
  const [state, setState] = useState<AuthState>({ loading: !!supabase, session: null, user: null });
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth
      .getSession()
      .then(
        ({ data }) =>
          alive &&
          setState({ loading: false, session: data.session, user: data.session?.user ?? null }),
      );
    const { data } = supabase.auth.onAuthStateChange(
      (_e, s) => alive && setState({ loading: false, session: s, user: s?.user ?? null }),
    );
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);
  const signOut = useCallback(async () => {
    await supabase!.auth.signOut();
  }, []);
  return { ...state, signIn, signUp, signOut };
}
