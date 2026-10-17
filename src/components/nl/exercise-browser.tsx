import { Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, EmptyState, Field, Select, Sheet, Skeleton, TextInput } from "./ui";
import { ExerciseVisual, MediaBadge, ExerciseArt } from "./exercise-visual";
import { FormGuidePanel } from "./form-guide";
import { VIcon } from "./icon";
import { addExerciseToWorkout } from "@/data/library-actions";
import {
  deleteCustomExercise,
  saveCustomExercise,
  useCatalogue,
  useEquipmentProfile,
  useFavourites,
} from "@/data/catalogue-runtime";
import { useCollection } from "@/data/hooks";
import { activeTemplates } from "@/data/selectors";
import { COL, type WorkoutTemplate } from "@/data/types";
import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  MUSCLES,
  MUSCLE_LABEL,
  PATTERNS,
  PATTERN_LABEL,
  type CatalogueExercise,
  type EquipmentId,
  type MuscleId,
  type Pattern,
  type TrackingType,
} from "@/domain/catalogue";
import {
  ACCESS_LABEL,
  ACCESS_TAGS,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  MODALITIES,
  MODALITY_LABEL,
  accessTagsOf,
  difficultyOf,
  mediaStateOf,
  modalityOf,
  type AccessTag,
  type Difficulty,
  type MediaState,
  type Modality,
} from "@/domain/catalogue-facets";
import { describeMedia, coverFrame } from "@/domain/exercise-media";
import { searchCatalogue } from "@/domain/catalogue-search";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;
const MEDIA_LABEL: Record<MediaState, string> = {
  motion: "Motion",
  steps: "Illustrated steps",
  still: "Single illustration",
  none: "None",
  authored_fallback: "No picture yet (form diagram)",
};

type Filters = {
  q: string;
  pattern: Pattern | "";
  muscle: MuscleId | "";
  equipment: EquipmentId | "";
  modality: Modality | "";
  difficulty: Difficulty | "";
  access: AccessTag[];
  media: MediaState | "";
  mine: boolean;
  saved: boolean;
};
const EMPTY: Filters = {
  q: "",
  pattern: "",
  muscle: "",
  equipment: "",
  modality: "",
  difficulty: "",
  access: [],
  media: "",
  mine: false,
  saved: false,
};

/** The whole catalogue, browsable: facets, pagination, detail with provenance, saved items and add-to-workout. */
export function ExerciseBrowser() {
  const cat = useCatalogue();
  const kit = useEquipmentProfile();
  const favs = useFavourites();
  const [f, setF] = useState<Filters>(EMPTY);
  const dq = useDeferredValue(f.q);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<CatalogueExercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const set = (patch: Partial<Filters>) => {
    setF((o) => ({ ...o, ...patch }));
    setPage(0);
  };

  const results = useMemo(
    () =>
      searchCatalogue(cat.exercises, {
        q: dq,
        pattern: f.pattern || undefined,
        muscle: f.muscle || undefined,
        equipment: f.equipment || undefined,
        modality: f.modality || undefined,
        difficulty: f.difficulty || undefined,
        access: f.access.length ? f.access : undefined,
        media: f.media === "" ? undefined : f.media,
        haveEquipment: f.mine ? kit.have : undefined,
        favouritesOnly: f.saved ? favs.ids : undefined,
      }),
    [
      cat.exercises,
      dq,
      f.pattern,
      f.muscle,
      f.equipment,
      f.modality,
      f.difficulty,
      f.access,
      f.media,
      f.mine,
      f.saved,
      kit.have,
      favs.ids,
    ],
  );
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = results.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const active = Object.entries(f).filter(
    ([k, v]) => k !== "q" && (Array.isArray(v) ? v.length : !!v),
  ).length;

  if (cat.status === "loading") return <Skeleton className="h-64" />;
  if (cat.status === "error")
    return (
      <EmptyState
        title="The library didn't load"
        body={`${cat.error ?? "Check your connection."} It is available offline once it has loaded once.`}
        action={<Button onClick={cat.retry}>Try again</Button>}
      />
    );

  return (
    <section aria-label="Every exercise" className="grid gap-5">
      <div className="grid gap-3 border-y border-line py-4">
        <label className="relative block">
          <span className="sr-only">Search exercises</span>
          <VIcon
            name="search"
            className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
          />
          <TextInput
            type="search"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search a movement, muscle or kit"
            className="pl-10"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            aria-expanded={showFilters}
            aria-controls="library-filters"
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters{active ? ` · ${active}` : ""}
          </Button>
          <Button
            size="sm"
            variant={f.saved ? "primary" : "ghost"}
            aria-pressed={f.saved}
            onClick={() => set({ saved: !f.saved })}
          >
            <VIcon name="favourite" size={16} /> Saved
          </Button>
          {active > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setF((o) => ({ ...EMPTY, q: o.q }))}>
              Clear filters
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAdding(true)}>
            <VIcon name="add" size={16} /> Add your own
          </Button>
        </div>
        {showFilters && (
          <div
            id="library-filters"
            className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <FilterSelect
              label="Movement"
              value={f.pattern}
              onChange={(v) => set({ pattern: v as Pattern | "" })}
              options={PATTERNS.map((p) => [p, PATTERN_LABEL[p]])}
            />
            <FilterSelect
              label="Muscle"
              value={f.muscle}
              onChange={(v) => set({ muscle: v as MuscleId | "" })}
              options={MUSCLES.map((m) => [m, MUSCLE_LABEL[m]])}
            />
            <FilterSelect
              label="Equipment"
              value={f.equipment}
              onChange={(v) => set({ equipment: v as EquipmentId | "" })}
              options={EQUIPMENT.map((m) => [m, EQUIPMENT_LABEL[m]])}
            />
            <FilterSelect
              label="Difficulty"
              value={f.difficulty}
              onChange={(v) => set({ difficulty: v as Difficulty | "" })}
              options={DIFFICULTIES.map((d) => [d, DIFFICULTY_LABEL[d]])}
            />
            <FilterSelect
              label="Modality"
              value={f.modality}
              onChange={(v) => set({ modality: v as Modality | "" })}
              options={MODALITIES.map((m) => [m, MODALITY_LABEL[m]])}
            />
            <FilterSelect
              label="Picture"
              value={f.media}
              onChange={(v) => set({ media: v as MediaState | "" })}
              options={(["steps", "motion", "still", "authored_fallback"] as MediaState[]).map(
                (m) => [m, MEDIA_LABEL[m]],
              )}
            />
            <fieldset className="sm:col-span-2 lg:col-span-3">
              <legend className="mb-1 text-sm font-medium">
                Accessibility (estimated from equipment and name)
              </legend>
              <div className="flex flex-wrap gap-2">
                {ACCESS_TAGS.map((a) => {
                  const on = f.access.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() =>
                        set({ access: on ? f.access.filter((x) => x !== a) : [...f.access, a] })
                      }
                      className={cn(
                        "min-h-11 border px-3 text-sm font-semibold",
                        on ? "border-primary bg-primary/10 text-primary" : "border-line",
                      )}
                    >
                      {ACCESS_LABEL[a]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={f.mine}
                onChange={(e) => set({ mine: e.target.checked })}
                className="size-5"
              />
              Only what my kit allows
            </label>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {results.length === 0
          ? "No exercises"
          : `${safePage * PAGE_SIZE + 1}–${safePage * PAGE_SIZE + slice.length} of ${results.length.toLocaleString("en-GB")} exercises`}
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          body="Try a shorter search or clear a filter."
          action={<Button onClick={() => setF(EMPTY)}>Clear everything</Button>}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
          {slice.map((e) => (
            <li key={e.id}>
              <ExerciseTile
                e={e}
                saved={favs.ids.includes(e.id)}
                onOpen={() => setOpen(e)}
                onSave={() => void favs.toggle(e.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
        >
          <Button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            <VIcon name="previous" size={16} /> Previous
          </Button>
          <p className="num text-sm">
            Page {safePage + 1} of {pages}
          </p>
          <Button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
            Next <VIcon name="next" size={16} />
          </Button>
        </nav>
      )}

      <ExerciseDetail
        e={open}
        onClose={() => setOpen(null)}
        saved={open ? favs.ids.includes(open.id) : false}
        onSave={() => open && void favs.toggle(open.id)}
      />
      <AddOwn open={adding} onOpenChange={setAdding} />
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function ExerciseTile({
  e,
  saved,
  onOpen,
  onSave,
}: {
  e: CatalogueExercise;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const d = useMemo(() => describeMedia(e.media), [e.media]);
  const cover = coverFrame(d);
  const [broken, setBroken] = useState(false);
  return (
    <div className="grid content-start gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${e.name}`}
        className="relative block aspect-[4/3] overflow-hidden border border-line bg-white text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {cover && !broken ? (
          <img
            src={cover.thumb ?? cover.url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="size-full object-contain"
          />
        ) : (
          <ExerciseArt name={e.name} pattern={e.pattern} className="size-full" />
        )}
        <MediaBadge d={d} className="absolute bottom-1.5 left-1.5 !px-1.5 !py-0.5 !text-[0.6rem]" />
      </button>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold leading-tight [overflow-wrap:anywhere]">
            {e.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {e.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(", ") || PATTERN_LABEL[e.pattern]}
          </p>
        </div>
        <button
          type="button"
          aria-label={`${saved ? "Remove" : "Save"} ${e.name}`}
          aria-pressed={saved}
          onClick={onSave}
          className="-mr-2 -mt-1 grid min-h-11 min-w-11 shrink-0 place-items-center"
        >
          <VIcon
            name="favourite"
            size={18}
            className={saved ? "fill-current text-primary" : "text-muted-foreground"}
          />
        </button>
      </div>
    </div>
  );
}

function ExerciseDetail({
  e,
  onClose,
  saved,
  onSave,
}: {
  e: CatalogueExercise | null;
  onClose: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  const custom = e?.source.provider === "custom";
  const [adding, setAdding] = useState(false);
  useEffect(() => setAdding(false), [e?.id]);
  const diff = e ? difficultyOf(e) : null;
  return (
    <Sheet
      open={!!e}
      onOpenChange={(o) => !o && onClose()}
      title={e?.name ?? "Exercise"}
      wide
      footer={
        e && (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setAdding(true)}>
              <VIcon name="add" size={16} /> Add to workout
            </Button>
            <Button variant={saved ? "secondary" : "ghost"} onClick={onSave} aria-pressed={saved}>
              <VIcon name="favourite" size={16} className={saved ? "fill-current" : ""} />
              {saved ? "Saved" : "Save"}
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
        <div className="grid gap-5 pb-2">
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
            <Chip tone="info">{MODALITY_LABEL[modalityOf(e)]}</Chip>
            {(e.equipment.length ? e.equipment : (["bodyweight"] as EquipmentId[])).map((m) => (
              <Chip key={m} tone="info">
                {EQUIPMENT_LABEL[m]}
                {e.equipmentDerived.includes(m) ? " (our guess)" : ""}
              </Chip>
            ))}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-line py-3 text-sm">
            <dt className="text-muted-foreground">Difficulty</dt>
            <dd>
              {diff ? DIFFICULTY_LABEL[diff.level] : ""}{" "}
              <span className="text-muted-foreground">
                {diff?.reviewed ? "(reviewed)" : "(estimated)"}
              </span>
            </dd>
            <dt className="text-muted-foreground">Accessibility</dt>
            <dd>
              {accessTagsOf(e)
                .map((a) => ACCESS_LABEL[a])
                .join(" · ") || "No estimates"}{" "}
              <span className="text-muted-foreground">(estimated)</span>
            </dd>
            <dt className="text-muted-foreground">Picture</dt>
            <dd>{MEDIA_LABEL[mediaStateOf(e).state]}</dd>
          </dl>
          {custom ? (
            <>
              <ExerciseArt name={e.name} pattern="Your exercise" className="aspect-[4/3] w-full" />
              <p className="text-muted-foreground">
                {e.instructions || "No instructions. You added this one."}
              </p>
            </>
          ) : (
            <FormGuidePanel exercise={e} name={e.name} />
          )}
          {!custom && (
            <div className="border-t border-line pt-4 text-xs text-muted-foreground">
              <p>{e.attribution}</p>
              <div className="mt-1 flex flex-wrap gap-x-4">
                <a
                  href={e.licence.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-1 underline"
                >
                  {e.licence.short} <VIcon name="external" size={16} />
                </a>
                {e.source.url && (
                  <a
                    href={e.source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-11 items-center gap-1 underline"
                  >
                    Source <VIcon name="external" size={16} />
                  </a>
                )}
                <Link to="/credits" className="inline-flex min-h-11 items-center underline">
                  All credits
                </Link>
              </div>
            </div>
          )}
          <AddToWorkout open={adding} exercise={e} onClose={() => setAdding(false)} />
        </div>
      )}
    </Sheet>
  );
}

function AddToWorkout({
  open,
  exercise,
  onClose,
}: {
  open: boolean;
  exercise: CatalogueExercise;
  onClose: () => void;
}) {
  const templates = activeTemplates(useCollection<WorkoutTemplate>(COL.templates).items);
  const [choice, setChoice] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const value = choice || templates[0]?.id || "new";
  return (
    <div role="region" aria-label="Add to workout" className="grid gap-3 border border-primary p-4">
      <p className="font-semibold">Add {exercise.name} to…</p>
      <Select aria-label="Workout" value={value} onChange={(ev) => setChoice(ev.target.value)}>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.letter ? `${t.letter} · ` : ""}
            {t.title}
          </option>
        ))}
        <option value="new">A new workout…</option>
      </Select>
      {value === "new" && (
        <TextInput
          aria-label="New workout name"
          placeholder="Name this workout"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          maxLength={60}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await addExerciseToWorkout(
                exercise,
                value === "new" ? { newTitle: title || exercise.name } : { templateId: value },
              );
              toast.success(
                r.added
                  ? "Added. Sets and reps are editable in Train."
                  : "Already in that workout.",
              );
              onClose();
            } catch {
              toast.error("Couldn't add it. Nothing was changed; try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Add
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
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
