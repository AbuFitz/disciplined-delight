import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CatalogueExercise,
  CatalogueSnapshot,
  EquipmentId,
  MuscleId,
  TrackingType,
} from "@/domain/catalogue";
import { COL } from "./types";
import { useCollection } from "./hooks";
import { newId, put, remove } from "./db";
import { applyLocalMedia, loadLocalMedia } from "./local-media";

/* ------------------------------ Snapshot ------------------------------ */
let inflight: Promise<CatalogueSnapshot> | null = null;
let loaded: CatalogueSnapshot | null = null;
/** Retired or merged ids (for example `xd:0001`) that resolve to a canonical id so old references keep working. */
let aliasMap: Record<string, string> = {};
export const canonicalId = (id: string) => aliasMap[id] ?? id;

export function loadCatalogue(): Promise<CatalogueSnapshot> {
  if (loaded) return Promise.resolve(loaded);
  inflight ??= Promise.all([
    fetch("/catalogue/v1/exercises.json").then((r) => {
      if (!r.ok) throw new Error(`Catalogue unavailable (${r.status})`);
      return r.json() as Promise<CatalogueSnapshot>;
    }),
    fetch("/catalogue/v1/aliases.json")
      .then((r) => (r.ok ? (r.json() as Promise<{ aliases: Record<string, string> }>) : null))
      .catch(() => null),
    loadLocalMedia(),
  ])
    .then(([snapshot, aliases, local]) => {
      aliasMap = aliases?.aliases ?? {};
      loaded = { ...snapshot, exercises: applyLocalMedia(snapshot.exercises, local) };
      return loaded;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/* ------------------------------ User data ------------------------------ */
export type EquipmentProfile = { id: "main"; have: EquipmentId[]; configured: boolean };
export type ExercisePref = { id: string; favourite?: boolean };
export type CustomExercise = {
  id: string;
  name: string;
  primaryMuscles: MuscleId[];
  equipment: EquipmentId[];
  tracking: TrackingType;
  note?: string;
};

export const DEFAULT_KIT: EquipmentId[] = ["dumbbell", "bench", "bodyweight"];

export function useEquipmentProfile() {
  const c = useCollection<EquipmentProfile>(COL.equipmentProfile);
  const p = c.items.find((x) => x.id === "main");
  return {
    ready: c.ready,
    configured: !!p?.configured,
    have: p?.have ?? DEFAULT_KIT,
    save: (have: EquipmentId[]) =>
      put(COL.equipmentProfile, "main", {
        id: "main",
        have,
        configured: true,
      } satisfies EquipmentProfile),
  };
}

export function useFavourites() {
  const c = useCollection<ExercisePref>(COL.exercisePrefs);
  const ids = useMemo(() => c.items.filter((x) => x.favourite).map((x) => x.id), [c.items]);
  return {
    ids,
    toggle: (id: string) =>
      put(COL.exercisePrefs, id, { id, favourite: !ids.includes(id) } satisfies ExercisePref),
  };
}

export function customToCatalogue(c: CustomExercise): CatalogueExercise {
  return {
    id: `custom:${c.id}`,
    source: { provider: "custom", externalId: 0, uuid: c.id, url: "", sourceUpdatedAt: "" },
    name: c.name,
    aliases: [],
    category: "Custom",
    primaryMuscles: c.primaryMuscles,
    secondaryMuscles: [],
    equipment: c.equipment,
    equipmentDerived: [],
    pattern: "other",
    tracking: c.tracking,
    instructions: c.note ?? "",
    cues: [],
    licence: { id: "own", short: "Yours", url: "" },
    author: "You",
    attribution: "Added by you",
    media: [],
    tier: "library",
    flags: ["custom"],
  };
}

export const saveCustomExercise = (c: Omit<CustomExercise, "id"> & { id?: string }) => {
  const id = c.id ?? newId();
  return put(COL.customExercises, id, { ...c, id } satisfies CustomExercise);
};
export const deleteCustomExercise = (id: string) => remove(COL.customExercises, id);

/** The snapshot plus the person's own exercises, with lookup by id. */
export function useCatalogue() {
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    snapshot?: CatalogueSnapshot;
    error?: string;
  }>(loaded ? { status: "ready", snapshot: loaded } : { status: "loading" });
  const custom = useCollection<CustomExercise>(COL.customExercises);
  const run = useCallback(() => {
    setState((s) => (s.snapshot ? s : { status: "loading" }));
    loadCatalogue().then(
      (snapshot) => setState({ status: "ready", snapshot }),
      (e: Error) => setState({ status: "error", error: e.message }),
    );
  }, []);
  useEffect(() => {
    if (!loaded) run();
  }, [run]);
  const exercises = useMemo(
    () => [...custom.items.map(customToCatalogue), ...(state.snapshot?.exercises ?? [])],
    [custom.items, state.snapshot],
  );
  const byId = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e]));
    // Merged or retired ids resolve to their canonical record, so existing plans and history keep working.
    for (const [from, to] of Object.entries(aliasMap)) {
      const target = map.get(to);
      if (target && !map.has(from)) map.set(from, target);
    }
    return map;
  }, [exercises]);
  return {
    status: state.status,
    error: state.error,
    snapshot: state.snapshot,
    exercises,
    byId,
    retry: run,
    custom: custom.items,
  };
}
