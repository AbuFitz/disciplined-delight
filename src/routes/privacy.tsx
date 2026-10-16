import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, EyeOff, Lock, ShieldCheck, Users } from "lucide-react";
import { PageHeader, Panel } from "@/components/nl/ui";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy · VAYVOR" },
      {
        name: "description",
        content:
          "A plain-English map of what stays private and what you deliberately share in VAYVOR.",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your data"
        title="Private by default"
        sub="A plain-English map of what stays yours, what reaches account services and what you choose to share."
        actions={
          <Link
            to="/settings"
            className="inline-flex min-h-12 items-center rounded-full border border-input px-6 font-semibold"
          >
            Open Settings
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel tone="green" className="lg:col-span-2">
          <ShieldCheck className="size-9" aria-hidden />
          <h2 className="mt-4 font-display text-3xl font-semibold">
            Nothing private is posted for you
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Workouts, meals, weight, routines, journal entries, mood, focus and Salah never appear
            in Circle automatically. A Circle post exists only after you write it and press Share.
          </p>
        </Panel>

        <Panel>
          <EyeOff className="size-7" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold">Only you</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <li>Journal and reflection text, mood and energy check-ins, and focus sessions.</li>
            <li>Salah setup, cached prayer times, prayer logs and whether Salah is enabled.</li>
            <li>Training logs, food logs, weight, goals, allergies and dietary notes.</li>
          </ul>
        </Panel>

        <Panel tone="dusk">
          <Users className="size-7" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold">Circle connections</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <li>
              Your handle and display name can be found by exact handle or display-name search.
            </li>
            <li>
              Accepted connections can see posts you deliberately share and the kudos on them.
            </li>
            <li>Chat messages and pact check-ins are visible only to the two participants.</li>
            <li>Blocking removes the connection and immediately closes shared visibility.</li>
          </ul>
        </Panel>

        <Panel tone="warm">
          <Database className="size-7" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold">Device, sync and backups</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Guests stay in this browser. Signed-in accounts use a separate on-device database and
            sync only after linking the account. Exported backups are plain JSON and can contain
            sensitive records, so keep them somewhere private.
          </p>
        </Panel>

        <Panel tone="warm">
          <Lock className="size-7" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold">Not end-to-end encrypted</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Configured account services protect traffic in transit and stored data at the provider,
            but the service operator can technically access synced records and chats. Do not use
            VAYVOR chat for passwords, financial details, medical records or emergencies.
          </p>
        </Panel>
      </div>

      <Panel className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Control stays visible</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Export, import, account removal and data erasure live in Settings. Connection and block
            controls live in Circle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/circle"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-semibold"
          >
            Circle controls
          </Link>
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
          >
            Data controls
          </Link>
        </div>
      </Panel>
    </>
  );
}
