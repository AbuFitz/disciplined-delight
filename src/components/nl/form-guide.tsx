import { useEffect, useState } from "react";
import type { CatalogueExercise } from "@/domain/catalogue";
import { guideFor, type FormGuide } from "@/domain/form-figure";
import { cn } from "@/lib/utils";
import { FormFigure } from "./form-figure";
import { ExerciseVisual } from "./exercise-visual";
import { instructionSteps } from "@/domain/exercise-media";
import { useReducedMotionPref } from "@/lib/media-prefs";
import { VIcon } from "./icon";

/**
 * Clear path into form guidance: the provider's illustrated frames, VAYVOR's original three-step diagram for the
 * movement pattern, neutral cues, and the instructions. Nothing here is medical advice.
 */
export function FormGuidePanel({
  exercise,
  name,
  intent,
  className,
}: {
  exercise?: CatalogueExercise;
  name: string;
  intent?: string;
  className?: string;
}) {
  const guide: FormGuide | undefined = guideFor(exercise?.pattern);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotionPref();
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [guide?.id, name]);
  useEffect(() => {
    if (!playing || !guide || reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % guide.frames.length), 1500);
    return () => clearInterval(id);
  }, [playing, guide, reduced]);
  const steps = instructionSteps(exercise?.instructions);
  return (
    <div className={cn("grid gap-6", className)}>
      <ExerciseVisual media={exercise?.media} name={name} pattern={exercise?.pattern} eager />
      {guide && (
        <section aria-label="Original form steps" className="grid gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-semibold">Form steps · {guide.title}</h3>
            <p className="eyebrow">VAYVOR illustration</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <div className="border border-line bg-surface">
              <FormFigure
                pose={guide.frames[step]!.pose}
                ghost={step > 0 ? guide.frames[step - 1]!.pose : undefined}
                title={`${guide.title}: ${guide.frames[step]!.label}`}
                className="aspect-[100/116] w-full"
              />
            </div>
            <div className="grid content-start gap-3">
              <ol className="grid gap-px border border-line bg-line">
                {guide.frames.map((f, i) => (
                  <li key={f.label}>
                    <button
                      type="button"
                      aria-current={i === step ? "step" : undefined}
                      onClick={() => {
                        setStep(i);
                        setPlaying(false);
                      }}
                      className={cn(
                        "flex min-h-12 w-full items-start gap-3 bg-background px-3 py-2 text-left text-sm",
                        i === step && "bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "num mt-0.5",
                          i === step ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{f.label}.</strong> {f.cue}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                disabled={reduced}
                aria-pressed={playing}
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex min-h-11 w-fit items-center gap-2 border border-line px-3 text-sm font-semibold disabled:opacity-50"
                title={reduced ? "Reduced motion is on: tap the steps instead." : undefined}
              >
                <VIcon name={playing ? "pause" : "play"} size={16} />
                {playing ? "Stop stepping" : "Step through"}
              </button>
            </div>
          </div>
          <p className="text-sm">
            <strong>Keep:</strong> {guide.keep} <strong className="ml-1">Make it easier:</strong>{" "}
            {guide.ease}
          </p>
          <p className="text-xs text-muted-foreground">
            A generic diagram for this movement pattern, not a recording of the exact variation.
            Stop if you feel pain or anything that doesn't feel right, and ask a qualified trainer
            if unsure.
          </p>
        </section>
      )}
      {(intent || steps.length > 0) && (
        <section aria-label="Cues" className="grid gap-2 border-t border-line pt-5">
          {intent && (
            <p>
              <span className="eyebrow mr-2">Intent</span>
              {intent}
            </p>
          )}
          {steps.length > 0 && (
            <ol className="grid gap-1 text-sm text-muted-foreground">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="num mr-2 text-foreground">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
