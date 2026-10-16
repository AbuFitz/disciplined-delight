import { useCollection } from "./hooks";
import { COL, type Session } from "./types";

export function useActiveSession(): Session | undefined {
  const { items } = useCollection<Session>(COL.sessions);
  return items.find((session) => session.status === "active" || session.status === "paused");
}
