import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "new-life-shopping-checklist-v1";

export function useShoppingChecklist() {
  const { user } = useAuth();
  const useDb = isSupabaseConfigured && !!user;

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  // Flips to false if the shopping_checklist column isn't in the DB yet —
  // keeps the checklist working locally instead of erroring.
  const [dbAvailable, setDbAvailable] = useState(true);

  useEffect(() => {
    if (useDb) {
      supabase!
        .from("user_settings")
        .select("shopping_checklist")
        .eq("id", user!.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setDbAvailable(false);
          } else {
            setChecked((data.shopping_checklist as Record<string, boolean>) ?? {});
          }
          setHydrated(true);
        });
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // corrupt or unavailable storage — fall back to empty
    }
    setHydrated(true);
  }, [useDb, user]);

  useEffect(() => {
    if (!hydrated || (useDb && dbAvailable)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked, hydrated, useDb, dbAvailable]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      if (useDb && dbAvailable) {
        supabase!
          .from("user_settings")
          .update({ shopping_checklist: next })
          .eq("id", user!.id)
          .then();
      }
    },
    [useDb, dbAvailable, user],
  );

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setChecked({});
    persist({});
  }, [persist]);

  return { checked, toggle, clear };
}
