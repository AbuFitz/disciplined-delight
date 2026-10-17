import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button, EmptyState, PageHeader, Panel, Skeleton } from "@/components/nl/ui";
import { useCatalogue } from "@/data/catalogue-runtime";
import { summariseCatalogueCredits } from "@/domain/catalogue-credits";

export const Route = createFileRoute("/credits")({
  component: CreditsPage,
  head: () => ({
    meta: [
      { title: "Credits & licences · VAYVOR" },
      {
        name: "description",
        content: "Sources, contributors and open licences for VAYVOR's exercise library.",
      },
    ],
  }),
});

const externalClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 font-semibold underline underline-offset-4";

function CreditsPage() {
  const catalogue = useCatalogue();
  const summary = catalogue.snapshot ? summariseCatalogueCredits(catalogue.snapshot) : null;

  return (
    <>
      <PageHeader
        eyebrow="About the library"
        title="Credits & licences"
        sub="The exercise library is built from licensed, credited work. The credit stays attached to every exercise, illustration and motion asset."
        actions={
          <Link
            to="/library"
            className="inline-flex min-h-12 items-center rounded-full border border-input px-6 font-semibold"
          >
            Open Library
          </Link>
        }
      />

      {catalogue.status === "loading" && <Skeleton className="h-72" />}
      {catalogue.status === "error" && (
        <EmptyState
          title="Credits aren't available yet"
          body={`${catalogue.error ?? "The library did not load."} Try again when you're online.`}
          action={<Button onClick={catalogue.retry}>Try again</Button>}
        />
      )}
      {catalogue.snapshot && summary && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel tone="green" className="lg:col-span-2">
            <p className="eyebrow">Source snapshot</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {summary.exercises.toLocaleString("en-GB")} credited exercises
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Exercise names, instructions and media come from{" "}
              {(catalogue.snapshot.providers ?? [catalogue.snapshot.provider]).map(
                (provider, index, all) => (
                  <span key={provider.name}>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-foreground underline underline-offset-4"
                    >
                      {provider.name}
                    </a>
                    {index < all.length - 1 ? " and " : ""}
                  </span>
                ),
              )}
              . VAYVOR normalises that material for search, offline use and plan building without
              removing its attribution or licence.
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Exercises" value={summary.exercises} />
              <Stat label="Exercise contributors" value={summary.exerciseContributors} />
              <Stat label="Media assets" value={summary.media} />
              <Stat label="Media contributors" value={summary.mediaContributors} />
            </dl>
          </Panel>

          <Panel>
            <p className="eyebrow">Source licences</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">What may be reused</h2>
            <ul className="mt-4 divide-y divide-line">
              {summary.licences.map((licence) => (
                <li key={licence.url || licence.id} className="py-4 first:pt-0">
                  <a
                    href={licence.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={externalClass}
                  >
                    {licence.short} <ExternalLink className="size-4" />
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {licence.exerciseCount.toLocaleString("en-GB")} exercise records
                    {licence.mediaCount > 0
                      ? ` · ${licence.mediaCount.toLocaleString("en-GB")} media assets`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel tone="dusk">
            <p className="eyebrow">Credit where it belongs</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Per-exercise detail</h2>
            <p className="mt-3 text-muted-foreground">
              Open any exercise in Library to see its contributor, exact licence, original source
              and media credit. Exercise data by RepDB (repdb.co) remains attributed throughout.
              User-created exercises remain yours and are labelled separately.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              These source licences apply to the catalogue records and credited media—not to
              unrelated VAYVOR app code or your private training data.
            </p>
            <Link
              to="/library"
              className="mt-5 inline-flex min-h-11 items-center rounded-full font-semibold underline underline-offset-4"
            >
              Browse exercise credits
            </Link>
          </Panel>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-background/45 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-semibold">{value.toLocaleString("en-GB")}</dd>
    </div>
  );
}
