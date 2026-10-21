import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, EyeOff, Lock, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Group, PageHeader, Panel, Section } from "@/components/nl/ui";

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

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5 p-4">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="mt-1 grid gap-1.5 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

const pill =
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-semibold transition active:scale-[0.97]";

function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy"
        sub="What stays yours, what reaches account services and what you choose to share."
      />

      <Panel tone="green" className="mb-6">
        <ShieldCheck className="size-8" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold tracking-tight">
          Nothing private is posted for you
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Workouts, meals, weight, routines, journal entries, mood, focus and Salah never appear in
          Circle automatically. A Circle post exists only after you write it and press Share.
        </p>
      </Panel>

      <Section title="Where things go">
        <Group as="ul">
          <Item icon={<EyeOff className="size-5" />} title="Only you">
            <p>Journal and reflection text, mood and energy check-ins, and focus sessions.</p>
            <p>Salah setup, cached prayer times, prayer logs and whether Salah is enabled.</p>
            <p>Training logs, food logs, weight, goals, allergies and dietary notes.</p>
          </Item>
          <Item icon={<Users className="size-5" />} title="Circle connections">
            <p>Your handle and display name can be found by exact handle or display-name search.</p>
            <p>Accepted connections can see posts you deliberately share and the kudos on them.</p>
            <p>
              Chat messages, pact check-ins and Four in a Row boards and dares are visible only to
              the two participants.
            </p>
            <p>
              Crew members can see the crew purpose, active roster and weekly roll calls that
              members write themselves.
            </p>
            <p>Blocking removes the connection and immediately closes shared visibility.</p>
          </Item>
          <Item icon={<Database className="size-5" />} title="Device, sync and backups">
            <p>
              Guests stay in this browser. Signed-in accounts use a separate on-device database and
              sync only after linking the account. Exported backups are plain JSON and can contain
              sensitive records, so keep them somewhere private.
            </p>
            <p>
              Background reminders are optional. When on, the next 48 hours of reminder times,
              titles, short bodies and destinations go to the reminder service and push provider.
              Routine reminders can include an activity's name and notes, so keep sensitive detail
              out of reminder-enabled activities.
            </p>
          </Item>
          <Item icon={<Lock className="size-5" />} title="Not end-to-end encrypted">
            <p>
              Configured account services protect traffic in transit and stored data at the
              provider, but the service operator can technically access synced records and chats. Do
              not use VAYVOR chat for passwords, financial details, medical records or emergencies.
            </p>
          </Item>
        </Group>
      </Section>

      <Section title="Control stays visible">
        <p className="mb-4 px-1 text-sm text-muted-foreground">
          Export, import, on-device account removal and data erasure live in Settings. Connection
          and block controls live in Circle.
        </p>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Link to="/settings" className={`${pill} bg-primary text-primary-foreground`}>
            Data controls
          </Link>
          <Link to="/circle" className={`${pill} bg-surface-2`}>
            Circle controls
          </Link>
        </div>
      </Section>
    </>
  );
}
