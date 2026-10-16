import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Heart, Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Sheet,
  Skeleton,
  TextInput,
  Switch,
} from "@/components/nl/ui";
import {
  deleteCustomExercise,
  saveCustomExercise,
  useCatalogue,
  useEquipmentProfile,
  useFavourites,
} from "@/data/catalogue-runtime";
import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  MUSCLES,
  MUSCLE_LABEL,
  PATTERN_LABEL,
  type CatalogueExercise,
  type EquipmentId,
  type MuscleId,
  type TrackingType,
} from "@/domain/catalogue";
import { searchCatalogue } from "@/domain/catalogue-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({ component: LibraryPage });

const PAGE = 40;

function LibraryPage() {
  const cat = useCatalogue();
  const kit = useEquipmentProfile();
  const favs = useFavourites();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [muscle, setMuscle] = useState<MuscleId | "">("");
  const [equipment, setEquipment] = useState<EquipmentId | "">("");
  const [mine, setMine] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<CatalogueExercise | null>(null);
  const [adding, setAdding] = useState(false);

  const results = useMemo(
    () =>
      searchCatalogue(cat.exercises, {
        q: dq,
        muscle: muscle || undefined,
        equipment: equipment || undefined,
        haveEquipment: mine ? kit.have : undefined,
        favouritesOnly: onlyFav ? favs.ids : undefined,
      }),
    [cat.exercises, dq, muscle, equipment, mine, kit.have, onlyFav, favs.ids],
  );

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Every move"
        sub={
          cat.snapshot
            ? `${cat.snapshot.counts.published.toLocaleString("en-GB")} exercises with credited instructions and photos. Search, filter, favourite.`
            : "Search, filter and favourite exercises."
        }
        actions={
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add your own
          </Button>
        }
      />

      <div className="mb-4 grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            type="search"
            aria-label="Search exercises"
            placeholder="Search: squat, row, hamstring…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
            className="pl-12"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            aria-label="Muscle"
            value={muscle}
            onChange={(e) => {
              setMuscle(e.target.value as MuscleId | "");
              setShown(PAGE);
            }}
          >
            <option value="">Any muscle</option>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Equipment"
            value={equipment}
            onChange={(e) => {
              setEquipment(e.target.value as EquipmentId | "");
              setShown(PAGE);
            }}
          >
            <option value="">Any equipment</option>
            {EQUIPMENT.map((m) => (
              <option key={m} value={m}>
                {EQUIPMENT_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Switch checked={mine} onChange={setMine} label="Only what I can do with my kit" />
          <Switch checked={onlyFav} onChange={setOnlyFav} label="Favourites only" />
        </div>
        <Link
          to="/train/build"
          className="min-h-11 py-2 text-sm font-semibold underline underline-offset-4"
        >
          Build me a plan from my kit
        </Link>
      </div>

      {cat.status === "loading" && <Skeleton className="h-64" />}
      {cat.status === "error" && (
        <EmptyState
          title="The library didn't load"
          body={`${cat.error ?? "Check your connection."} It will be available offline once it has loaded once.`}
          action={<Button onClick={cat.retry}>Try again</Button>}
        />
      )}
      {cat.status === "ready" && (
        <>
          <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
            {results.length.toLocaleString("en-GB")}{" "}
            {results.length === 1 ? "exercise" : "exercises"}
          </p>
          {results.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              body="Try a shorter search or clear a filter."
              action={
                <Button
                  onClick={() => {
                    setQ("");
                    setMuscle("");
                    setEquipment("");
                    setMine(false);
                    setOnlyFav(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {results.slice(0, shown).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setOpen(e)}
                    className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left active:bg-surface-2"
                  >
                    <Thumb e={e} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-bold leading-tight">
                        {e.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {e.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(", ") ||
                          "No muscle listed"}
                        {" · "}
                        {e.equipment.length
                          ? e.equipment.map((m) => EQUIPMENT_LABEL[m]).join(", ")
                          : "Bodyweight"}
                      </span>
                    </span>
                    {favs.ids.includes(e.id) && (
                      <Heart
                        className="size-5 shrink-0 fill-current text-primary"
                        aria-label="Favourite"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {results.length > shown && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setShown((n) => n + PAGE)}>
                Show more ({results.length - shown} left)
              </Button>
            </div>
          )}
        </>
      )}

      <DetailSheet
        e={open}
        onClose={() => setOpen(null)}
        fav={open ? favs.ids.includes(open.id) : false}
        onFav={() => open && void favs.toggle(open.id)}
      />
      <AddOwn open={adding} onOpenChange={setAdding} />
    </>
  );
}

function Thumb({ e, big }: { e: CatalogueExercise; big?: boolean }) {
  const m = e.media[0];
  const size = big ? "h-44 w-full" : "size-16";
  if (!m) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-surface-2 font-display text-2xl font-extrabold text-muted-foreground",
          size,
        )}
      >
        {e.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={m.thumb ?? m.url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("shrink-0 rounded-xl bg-white object-contain", size)}
    />
  );
}

function DetailSheet({
  e,
  onClose,
  fav,
  onFav,
}: {
  e: CatalogueExercise | null;
  onClose: () => void;
  fav: boolean;
  onFav: () => void;
}) {
  const custom = e?.source.provider === "custom";
  return (
    <Sheet
      open={!!e}
      onOpenChange={(o) => !o && onClose()}
      title={e?.name ?? "Exercise"}
      wide
      footer={
        e && (
          <div className="flex flex-wrap gap-2">
            <Button variant={fav ? "primary" : "secondary"} onClick={onFav} aria-pressed={fav}>
              <Heart className={cn("size-4", fav && "fill-current")} />
              {fav ? "Favourite" : "Add to favourites"}
            </Button>
            {custom && (
              <Button
                variant="danger"
                onClick={() => {
                  void deleteCustomExercise(e.source.uuid);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
          </div>
        )
      }
    >
      {e && (
        <div className="grid gap-4 pb-2">
          {e.media.length > 0 && (
            <div className="grid gap-3">
              {e.media.slice(0, 2).map((m) => (
                <figure key={m.id} className="grid gap-1">
                  <img
                    src={m.url}
                    alt={`${e.name}, demonstration`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-full rounded-2xl bg-white object-contain"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    Photo by {m.author || "unknown author"} · {m.licence.short}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {e.primaryMuscles.map((m) => (
              <Chip key={m} tone="ok">
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
            {e.secondaryMuscles.map((m) => (
              <Chip key={m}>{MUSCLE_LABEL[m]}</Chip>
            ))}
            <Chip tone="info">{PATTERN_LABEL[e.pattern]}</Chip>
            {(e.equipment.length ? e.equipment : (["bodyweight"] as EquipmentId[])).map((m) => (
              <Chip key={m} tone="info">
                {EQUIPMENT_LABEL[m]}
                {e.equipmentDerived.includes(m) ? " (our guess)" : ""}
              </Chip>
            ))}
          </div>
          {e.instructions ? (
            <div>
              <p className="eyebrow mb-1">How to</p>
              <p className="whitespace-pre-line leading-relaxed">{e.instructions}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No instructions. You added this one.</p>
          )}
          {e.cues.length > 0 && (
            <ul className="list-disc pl-5">
              {e.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {!custom && (
            <div className="rounded-2xl bg-surface-2/60 p-3 text-xs text-muted-foreground">
              <p>{e.attribution}</p>
              <div className="mt-1 flex flex-wrap gap-x-4">
                <a
                  href={e.licence.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-1 underline"
                >
                  {e.licence.short} <ExternalLink className="size-3" />
                </a>
                <a
                  href={e.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-1 underline"
                >
                  Source <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

const TRACK_LABEL: Record<TrackingType, string> = {
  weight_reps: "Weight and reps",
  bodyweight_reps: "Bodyweight reps",
  assisted_reps: "Assisted reps",
  time: "Time (holds)",
  distance_time: "Distance and time",
};

function AddOwn({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleId>("chest");
  const [equip, setEquip] = useState<EquipmentId>("bodyweight");
  const [tracking, setTracking] = useState<TrackingType>("weight_reps");
  const [note, setNote] = useState("");
  const ok = name.trim().length >= 2;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add your own exercise"
      description="Kept on your account. It shows in the library and can be added to any workout."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!ok}
          onClick={async () => {
            await saveCustomExercise({
              name: name.trim(),
              primaryMuscles: [muscle],
              equipment: equip === "bodyweight" ? [] : [equip],
              tracking,
              note: note.trim() || undefined,
            });
            setName("");
            setNote("");
            onOpenChange(false);
          }}
        >
          Save exercise
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Main muscle">
          <Select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleId)}>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Equipment">
          <Select value={equip} onChange={(e) => setEquip(e.target.value as EquipmentId)}>
            {EQUIPMENT.map((m) => (
              <option key={m} value={m}>
                {EQUIPMENT_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What do you record?">
          <Select value={tracking} onChange={(e) => setTracking(e.target.value as TrackingType)}>
            {(Object.keys(TRACK_LABEL) as TrackingType[]).map((t) => (
              <option key={t} value={t}>
                {TRACK_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
        </Field>
      </div>
    </Sheet>
  );
}
