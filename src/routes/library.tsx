import { createFileRoute, Link } from "@tanstack/react-router";
import { ExerciseBrowser } from "@/components/nl/exercise-browser";
import { PageHeader } from "@/components/nl/ui";
import { WorkoutLibrary } from "@/components/nl/workout-library";
import { useCatalogue } from "@/data/catalogue-runtime";
import { cn } from "@/lib/utils";

type Tab = "workouts" | "programmes" | "exercises";
export const Route = createFileRoute("/library")({
  component: LibraryPage,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s.tab === "workouts" || s.tab === "programmes" || s.tab === "exercises" ? { tab: s.tab } : {},
});

const TABS: { id: Tab; label: string }[] = [
  { id: "workouts", label: "Workouts" },
  { id: "programmes", label: "Programmes" },
  { id: "exercises", label: "Exercises" },
];

function LibraryPage() {
  const { tab = "workouts" } = Route.useSearch();
  const nav = Route.useNavigate();
  const cat = useCatalogue();
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Every move"
        sub={
          cat.snapshot
            ? `${cat.snapshot.counts.published.toLocaleString("en-GB")} exercises, authored workouts and programmes, all with credited demonstrations or a form guide.`
            : "Workouts, programmes and every exercise."
        }
      />
      <div role="tablist" aria-label="Library" className="mb-6 flex border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => nav({ search: t.id === "workouts" ? {} : { tab: t.id } })}
            className={cn(
              "min-h-11 flex-1 border-b-2 px-3 text-sm font-semibold sm:flex-none sm:px-6",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "exercises" ? (
        <ExerciseBrowser />
      ) : (
        <WorkoutLibrary
          embedded
          activeTab={tab}
          onTabChange={(next) => nav({ search: next === "workouts" ? {} : { tab: next } })}
        />
      )}
      <p className="mt-10 flex flex-wrap gap-x-5 border-t border-line pt-4 text-sm">
        <Link
          to="/train/build"
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        >
          Build me a plan from my kit
        </Link>
        <Link
          to="/credits"
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        >
          Credits and licences
        </Link>
      </p>
    </>
  );
}
