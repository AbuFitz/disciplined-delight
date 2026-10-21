/**
 * Development-only local media source. The exercise demonstrations in the Gym visual dataset are
 * (c) Gym visual and NOT licensed to this project, so they are never part of the catalogue, public/
 * or a production build. This adapter does nothing unless BOTH hold:
 *   1. the dev server is running (import.meta.env.DEV), and
 *   2. VITE_LOCAL_MEDIA=gymvisual is set in an untracked env file (for example .env.local).
 * Files come from the gitignored cache .local-media/gymvisual (see `npm run catalogue:local-media`).
 * Once a licence is supplied the production-safe path is a normal catalogue media source: replace this
 * adapter's output with licensed MediaItems (same MediaItem shape) and drop the dev flag.
 */
import type { CatalogueExercise, MediaItem } from "@/domain/catalogue";
import { LOCAL_RESTRICTED_LICENCE_ID } from "@/domain/exercise-media";

type IndexEntry = { datasetId: string; image?: string; gif?: string };
type LocalIndex = { entries: Record<string, IndexEntry[]> };

let loading: Promise<Map<string, MediaItem[]>> | null = null;

/** Resolves to an empty map unless the explicit local flag is on in a dev server. */
export function loadLocalMedia(): Promise<Map<string, MediaItem[]>> {
  if (import.meta.env.DEV && import.meta.env.VITE_LOCAL_MEDIA === "gymvisual") {
    loading ??= fetch("/local-media/index.json")
      .then((r) => (r.ok ? (r.json() as Promise<LocalIndex>) : { entries: {} }))
      .catch(() => ({ entries: {} }) as LocalIndex)
      .then((index) => {
        const map = new Map<string, MediaItem[]>();
        for (const [id, list] of Object.entries(index.entries)) {
          const items = list.flatMap((e): MediaItem[] =>
            e.gif
              ? [
                  {
                    id: `local-gv:${e.datasetId}`,
                    kind: "animation",
                    url: `/local-media/gymvisual/${e.gif}`,
                    thumb: e.image ? `/local-media/gymvisual/${e.image}` : undefined,
                    poster: e.image ? `/local-media/gymvisual/${e.image}` : undefined,
                    mimeType: "image/gif",
                    isMain: true,
                    licence: {
                      id: LOCAL_RESTRICTED_LICENCE_ID,
                      short: "Local dev only · © Gym visual (not licensed)",
                      url: "https://gymvisual.com/content/3-terms-and-conditions-of-use",
                    },
                    author: "© Gym visual",
                    sourceUrl: "https://gymvisual.com/",
                  },
                ]
              : [],
          );
          if (items.length) map.set(id, items);
        }
        return map;
      });
    return loading;
  }
  return Promise.resolve(new Map());
}

/** Prepends local media (consistent short loops) to exercises that have it; licensed media stays as fallback. */
export function applyLocalMedia(
  exercises: CatalogueExercise[],
  local: Map<string, MediaItem[]>,
): CatalogueExercise[] {
  if (local.size === 0) return exercises;
  return exercises.map((e) => {
    const extra = local.get(e.id);
    return extra ? { ...e, media: [...extra, ...e.media] } : e;
  });
}
