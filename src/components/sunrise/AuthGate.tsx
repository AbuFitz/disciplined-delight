import type { ReactNode } from "react";

/**
 * Sign-in is disabled for now — the app is open, running on localStorage only.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
