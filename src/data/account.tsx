import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getScope, sameScope, scopeDbName, setScope, type Scope } from "./scope";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

const ScopeCtx = createContext<Scope | null>(null);
export const useScope = (): Scope => {
  const s = useContext(ScopeCtx);
  if (!s) throw new Error("useScope must be used inside <ScopeGate>");
  return s;
};

/**
 * Decides whose data is on screen. The transition is atomic from the user's point of view:
 * while the storage scope and the auth state disagree, NOTHING from either scope is rendered, and
 * everything underneath is re-mounted (fresh component state, drafts and caches) once they agree.
 */
export function ScopeGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const auth = useAuth();
  const desired: Scope | null = !isSupabaseConfigured
    ? { kind: "guest" }
    : auth.loading
      ? null
      : auth.user
        ? { kind: "user", userId: auth.user.id }
        : { kind: "guest" };
  const key = desired ? scopeDbName(desired) : "pending";
  const [, bump] = useState(0);

  useEffect(() => {
    // `desired` is derived from `key`, so this runs exactly when the target scope changes.
    setScope(desired);
    bump((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const applied = getScope();
  if (!desired || !applied || !sameScope(applied, desired)) return <>{fallback}</>;
  return (
    <ScopeCtx.Provider value={applied} key={scopeDbName(applied)}>
      {children}
    </ScopeCtx.Provider>
  );
}
