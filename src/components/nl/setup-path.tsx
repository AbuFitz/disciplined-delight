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
      done: !!companion?.setupDone,
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
  const left = steps.filter((step) => !step.done);
  if (!left.length) return null;
  return (
    <section className="mb-6 outline-none" aria-labelledby="setup-path-title">
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
        <h2 id="setup-path-title" className="text-[1.05rem] font-semibold tracking-tight">
          Your setup path
        </h2>
        <p className="text-sm text-muted-foreground">Optional · {left.length} left</p>
      </div>
      <div className="overflow-hidden rounded-3xl bg-surface/80 [&>*+*]:border-t [&>*+*]:border-line/70">
        {left.slice(0, 3).map((step) => (
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
            className="flex min-h-16 items-center gap-3.5 px-4 py-3 transition active:bg-surface-2/70"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <VIcon name={step.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight">{step.title}</span>
              <span className="block text-sm text-muted-foreground">
                {step.value} · {step.time}
              </span>
            </span>
            <VIcon name="next" size={18} className="shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}
