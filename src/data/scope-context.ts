import { createContext, useContext } from "react";
import type { Scope } from "./scope";

export const ScopeContext = createContext<Scope | null>(null);

export const useScope = (): Scope => {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error("useScope must be used inside <ScopeGate>");
  return scope;
};
