import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  ConfirmDialog,
  Field,
  NumberField,
  Row,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from "./ui";
import { newId, put } from "@/data/db";
import { COL, type TemplateExercise, type WorkoutTemplate } from "@/data/types";
import type { ProgramRevision } from "@/data/types";
import { useCollection } from "@/data/hooks";
import { restoreTemplateRevision, saveTemplateRevision } from "@/data/actions";
import { WEEKDAY_SHORT } from "@/domain/dates";
import { schemeFrom } from "@/domain/scheme";

const blankExercise = (): TemplateExercise => ({
  id: newId(),
  name: "",
  sets: 3,
  repMin: 8,
  repMax: 12,
  schemeText: "3 × 8–12",
});

/** Edit a workout template. Saving changes future sessions only; past sessions keep their own snapshot. */
export function TemplateEditor({
  template,
  onClose,
  count,
  isNew,
}: {
  template: WorkoutTemplate | null;
  onClose: () => void;
  count: number;
  isNew: boolean;
}) {
  const [t, setT] = useState<WorkoutTemplate | null>(null);
  const [ex, setEx] = useState<TemplateExercise | null>(null);
  const [archive, setArchive] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const revisions = useCollection<ProgramRevision>(COL.programRevisions)
    .items.filter((revision) => revision.templateId === template?.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const key = template?.id ?? null;
  if (key !== seen) {
    setSeen(key);
    setT(template);
  }
  if (!t) return <Sheet open={false} onOpenChange={() => {}} title="Workout" children={null} />;
  const set = (p: Partial<WorkoutTemplate>) => setT({ ...t, ...p });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= t.exercises.length) return;
    const a = [...t.exercises];
    [a[i], a[j]] = [a[j]!, a[i]!];
    set({ exercises: a });
  };
  const saveEx = (e: TemplateExercise) => {
    const exists = t.exercises.some((x) => x.id === e.id);
    set({
      exercises: exists ? t.exercises.map((x) => (x.id === e.id ? e : x)) : [...t.exercises, e],
    });
    setEx(null);
  };

  return (
    <>
      <Sheet
        open
        wide
        onOpenChange={(o) => !o && onClose()}
        title={isNew ? "New workout" : `Edit workout ${t.letter}`}
        description="Changes apply to future sessions. Sessions you've already done keep the exercises and targets they had."
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <>
                <Button
                  variant="secondary"
                  aria-label="Duplicate workout"
                  onClick={async () => {
                    const copy: WorkoutTemplate = {
                      ...t,
                      id: newId(),
                      legacyId: undefined,
                      title: `${t.title} copy`,
                      weekday: null,
                      order: count,
                      exercises: t.exercises.map((e) => ({
                        ...e,
                        id: newId(),
                        legacyId: undefined,
                      })),
                    };
                    await put(COL.templates, copy.id, copy);
                    toast.success("Duplicated. Find it in your list.");
                    onClose();
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="danger" onClick={() => setArchive(true)}>
                  Archive
                </Button>
              </>
            )}
            <Button
              variant="primary"
              className="flex-1"
              disabled={!t.title.trim()}
              onClick={async () => {
                const next = {
                  ...t,
                  title: t.title.trim(),
                  letter: t.letter.trim() || "?",
                };
                if (isNew || !template) await put(COL.templates, t.id, next);
                else await saveTemplateRevision(template, next, "Workout edited");
                toast.success("Workout saved");
                onClose();
              }}
            >
              Save workout
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 pb-4">
          {!isNew && revisions.length > 0 && (
            <details className="border-b border-line pb-3">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
                Version history ({revisions.length})
              </summary>
              <ul>
                {revisions.slice(0, 5).map((revision) => (
                  <li
                    key={revision.id}
                    className="flex items-center justify-between gap-3 border-t border-line py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {new Date(revision.createdAt).toLocaleString("en-GB")} · {revision.reason}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await restoreTemplateRevision(revision);
                        toast.success("Earlier workout restored");
                        onClose();
                      }}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Field label="Letter" htmlFor="t-l">
              <TextInput
                id="t-l"
                maxLength={2}
                value={t.letter}
                onChange={(e) => set({ letter: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Name" htmlFor="t-t">
              <TextInput
                id="t-t"
                value={t.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Chest & Triceps"
              />
            </Field>
          </div>
          <Field label="Focus or notes (optional)" htmlFor="t-f">
            <TextArea
              id="t-f"
              className="min-h-20"
              value={t.focus}
              onChange={(e) => set({ focus: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weekday" htmlFor="t-w">
              <Select
                id="t-w"
                value={t.weekday ?? ""}
                onChange={(e) =>
                  set({ weekday: e.target.value === "" ? null : Number(e.target.value) })
                }
              >
                <option value="">Not scheduled</option>
                {WEEKDAY_SHORT.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Usual time (optional)" htmlFor="t-ti">
              <TextInput
                id="t-ti"
                type="time"
                value={t.time ?? ""}
                onChange={(e) => set({ time: e.target.value || undefined })}
              />
            </Field>
          </div>

          <section aria-label="Exercises">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="eyebrow">Exercises ({t.exercises.length})</h3>
              <Button size="sm" variant="secondary" onClick={() => setEx(blankExercise())}>
                <Plus className="size-4" />
                Add exercise
              </Button>
            </div>
            {t.exercises.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No exercises yet.</p>
            ) : (
              <ul>
                {t.exercises.map((e, i) => (
                  <Row as="li" key={e.id} className="justify-between">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setEx(e)}>
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-sm tnum text-muted-foreground">
                        {e.schemeText}
                        {e.equipment ? ` · ${e.equipment}` : ""}
                      </p>
                    </button>
                    <div className="flex shrink-0">
                      <button
                        aria-label={`Move ${e.name} up`}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        aria-label={`Move ${e.name} down`}
                        disabled={i === t.exercises.length - 1}
                        onClick={() => move(i, 1)}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                  </Row>
                ))}
              </ul>
            )}
          </section>

          {t.cardio !== undefined && (
            <section aria-label="Optional cardio" className="grid gap-3">
              <h3 className="eyebrow">Optional cardio (separate from the lifting session)</h3>
              <Field label="Machine" htmlFor="t-cm">
                <TextInput
                  id="t-cm"
                  value={t.cardio?.machine ?? ""}
                  onChange={(e) =>
                    set({ cardio: { machine: e.target.value, text: t.cardio?.text ?? "" } })
                  }
                />
              </Field>
              <Field label="Guidance" htmlFor="t-ct">
                <TextInput
                  id="t-ct"
                  value={t.cardio?.text ?? ""}
                  onChange={(e) =>
                    set({ cardio: { machine: t.cardio?.machine ?? "", text: e.target.value } })
                  }
                />
              </Field>
            </section>
          )}
        </div>
      </Sheet>
      <ExerciseEditor
        exercise={ex}
        onCancel={() => setEx(null)}
        onSave={saveEx}
        onRemove={(id) => {
          set({ exercises: t.exercises.filter((x) => x.id !== id) });
          setEx(null);
        }}
      />
      <ConfirmDialog
        open={archive}
        onOpenChange={setArchive}
        tone="primary"
        title="Archive this workout?"
        body="It leaves your list and schedule. Sessions already recorded keep their details."
        confirmLabel="Archive"
        onConfirm={async () => {
          await put(COL.templates, t.id, {
            ...t,
            archivedAt: new Date().toISOString(),
            weekday: null,
          });
          setArchive(false);
          onClose();
          toast("Archived");
        }}
      />
    </>
  );
}

function ExerciseEditor({
  exercise,
  onCancel,
  onSave,
  onRemove,
}: {
  exercise: TemplateExercise | null;
  onCancel: () => void;
  onSave: (e: TemplateExercise) => void;
  onRemove: (id: string) => void;
}) {
  const [e, setE] = useState<TemplateExercise | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  if ((exercise?.id ?? null) !== seen) {
    setSeen(exercise?.id ?? null);
    setE(exercise);
  }
  const set = (p: Partial<TemplateExercise>) => e && setE({ ...e, ...p });
  const links = e?.links ?? [];
  const badRange = e ? e.repMin > e.repMax : false;
  return (
    <Sheet
      open={!!exercise && !!e}
      onOpenChange={(o) => !o && onCancel()}
      title={exercise?.name ? "Edit exercise" : "New exercise"}
      footer={
        e && (
          <div className="flex gap-2">
            <Button variant="danger" aria-label="Remove exercise" onClick={() => onRemove(e.id)}>
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={!e.name.trim() || badRange || e.sets < 1}
              onClick={() =>
                onSave({
                  ...e,
                  name: e.name.trim(),
                  schemeText: schemeFrom(e.sets, e.repMin, e.repMax, e.schemeText),
                })
              }
            >
              Done
            </Button>
          </div>
        )
      }
    >
      {e && (
        <div className="grid gap-4 pb-4">
          <Field label="Name" htmlFor="x-n">
            <TextInput id="x-n" value={e.name} onChange={(ev) => set({ name: ev.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Sets">
              <NumberField
                label="Sets"
                value={e.sets}
                onChange={(v) => set({ sets: Math.max(1, v ?? 1) })}
                decimals={0}
                min={1}
                max={10}
                stepper
              />
            </Field>
            <Field label="Reps from">
              <NumberField
                label="Rep range low"
                value={e.repMin}
                onChange={(v) => set({ repMin: v ?? 1 })}
                decimals={0}
                min={1}
                stepper={false}
              />
            </Field>
            <Field label="Reps to" error={badRange ? "Must be at least the low end" : undefined}>
              <NumberField
                label="Rep range high"
                value={e.repMax}
                onChange={(v) => set({ repMax: v ?? 1 })}
                decimals={0}
                min={1}
                stepper={false}
              />
            </Field>
          </div>
          <Field
            label="Equipment"
            htmlFor="x-e"
            hint="Used to pick a sensible weight step: cables 1 kg, machines 2.5 kg."
          >
            <TextInput
              id="x-e"
              value={e.equipment ?? ""}
              onChange={(ev) => set({ equipment: ev.target.value || undefined })}
            />
          </Field>
          <Field label="Rest between sets">
            <NumberField
              label="Rest"
              unit="s"
              step={15}
              decimals={0}
              value={e.restSeconds}
              onChange={(v) => set({ restSeconds: v })}
              placeholder="90"
            />
          </Field>
          <Field label="Technique notes" htmlFor="x-c">
            <TextArea
              id="x-c"
              className="min-h-24"
              value={e.cue ?? ""}
              onChange={(ev) => set({ cue: ev.target.value || undefined })}
            />
          </Field>
          <Field label="Alternative exercise" htmlFor="x-a">
            <TextInput
              id="x-a"
              value={e.alternative ?? ""}
              onChange={(ev) => set({ alternative: ev.target.value || undefined })}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Reference links</legend>
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2">
                <TextInput
                  aria-label="Link label"
                  placeholder="Label"
                  value={l.label}
                  onChange={(ev) =>
                    set({
                      links: links.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)),
                    })
                  }
                />
                <TextInput
                  aria-label="Link URL"
                  inputMode="url"
                  placeholder="https://"
                  value={l.url}
                  onChange={(ev) =>
                    set({
                      links: links.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)),
                    })
                  }
                />
                <button
                  aria-label="Remove link"
                  onClick={() => set({ links: links.filter((_, j) => j !== i) })}
                  className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => set({ links: [...links, { label: "", url: "" }] })}
              >
                <Plus className="size-4" />
                Add link
              </Button>
            </div>
          </fieldset>
        </div>
      )}
    </Sheet>
  );
}
