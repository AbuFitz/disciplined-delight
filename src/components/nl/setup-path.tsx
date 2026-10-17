import { Link } from "@tanstack/react-router";
import { useCollection, useProfile } from "@/data/hooks";
import { COL, type GymLocation, type Session } from "@/data/types";
import { resolveFaithProfile } from "@/domain/faith";
import type { CompanionConfig } from "@/domain/companion";
import { VIcon, type VIconName } from "./icon";

type Step = {
  title: string;
  value: string;
  time: string;
  done: boolean;
  to: "/train" | "/train/build" | "/settings" | "/circle/challenges";
  hash?: string;
  icon: VIconName;
};

/** Progressive post-onboarding path: optional systems stay out of the core setup wizard. */
export function SetupPath() {
  const { profile } = useProfile();
  const sessions = useCollection<Session>(COL.sessions);
  const locations = useCollection<GymLocation>(COL.gymLocations);
  const companion = useCollection<CompanionConfig>(COL.companion).items.find(
    (item) => item.id === "main",
  );
  if (!profile) return null;
  const steps: Step[] = [
    {
      title: "Finish your first workout",
      value: "Get a useful starting point",
      time: "Now",
      done: false,
      to: "/train",
      icon: "training",
    },
    {
      title: "Tune your plan",
      value: "Days, equipment and constraints",
      time: "3 min",
      done: !!profile.planning,
      to: "/train/build",
      icon: "adaptation",
    },
    {
      title: "Add Gym Mode",
      value: "Voice, cues and optional location",
      time: "2 min",
      done: !!profile.gymMode || locations.items.length > 0,
      to: "/settings",
      hash: "training",
      icon: "readiness",
    },
    {
      title: "Choose Buddy",
      value: "Tone, placement and quiet hours",
      time: "2 min",
      done: !!companion?.enabled,
      to: "/settings",
      hash: "companion",
      icon: "buddy",
    },
    {
      title: "Connect music",
      value: "Link a Spotify or Apple Music playlist",
      time: "1 min",
      done: !!profile.trainingMusic,
      to: "/settings",
      hash: "training",
      icon: "play",
    },
    {
      title: "Faith & reflection",
      value: "Optional private practice support",
      time: "2 min",
      done: resolveFaithProfile(profile).enabled,
      to: "/settings",
      hash: "faith",
      icon: "spirituality",
    },
    {
      title: "Social challenges",
      value: "Available when you choose to invite someone",
      time: "Available",
      done: false,
      to: "/circle/challenges",
      icon: "community",
    },
  ];
  if (sessions.items.some((session) => session.status === "completed")) steps[0]!.done = true;
  return (
    <section
      className="mb-8 border-y border-line py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-labelledby="setup-path-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Progressive setup</p>
          <h2 id="setup-path-title" className="font-display text-2xl font-semibold">
            Your setup path
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">Optional · stop and resume any time</p>
      </div>
      <div className="mt-4 grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <Link
            key={step.title}
            to={step.to}
            hash={step.hash}
            onClick={(event) => {
              if (step.to !== "/settings" || !step.hash) return;
              if (window.location.pathname !== "/settings") return;
              event.preventDefault();
              if (window.location.hash === `#${step.hash}`) {
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              } else {
                window.location.hash = step.hash;
              }
            }}
            className="group flex min-h-24 gap-3 bg-background p-4 hover:bg-surface"
          >
            <VIcon
              name={step.icon}
              className={step.done ? "text-primary" : "text-muted-foreground"}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{step.title}</span>
              <span className="block text-sm text-muted-foreground">{step.value}</span>
              <span className="eyebrow mt-1 block">{step.done ? "Set" : step.time}</span>
            </span>
            <VIcon
              name="next"
              size={16}
              className="mt-1 text-muted-foreground group-hover:text-primary"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
