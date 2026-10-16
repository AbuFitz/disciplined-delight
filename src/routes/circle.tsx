import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PageHeader, Panel } from "@/components/nl/ui";
import { useAccountProfile } from "@/data/account-profile";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/circle")({ component: CirclePage });

function CirclePage() {
  const auth = useAuth();
  const acct = useAccountProfile();
  const handle = acct.state.status === "ready" ? acct.state.profile.username : null;
  return (
    <>
      <PageHeader
        eyebrow="Circle"
        title="Together"
        sub="Friends, crews, challenges, medals and chat."
      />
      <Panel aria-label="Status">
        <h2 className="font-display text-2xl font-bold">Not open yet</h2>
        <p className="mt-2 max-w-prose">
          Circle is being built in a later release. Nothing here is live: there are no other people
          to follow, no scores and no messages yet, and VAYVOR won't show you any pretend ones.
        </p>
        <div className="mt-4 text-sm">
          {handle ? (
            <p>
              Your handle <strong>@{handle}</strong> is reserved for when it opens.
            </p>
          ) : auth.user ? (
            <p>
              Finish your profile to reserve a handle.{" "}
              <Link
                to="/settings"
                className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                Open Settings
              </Link>
            </p>
          ) : (
            <p>
              Create a free account to reserve a handle.{" "}
              <Link
                to="/settings"
                className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                Open Settings
              </Link>
            </p>
          )}
        </div>
      </Panel>
      <Panel className="mt-4" aria-label="Privacy">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Lock className="size-5" aria-hidden />
          What stays private
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Your journals, mood check-ins, reflections and prayer records are private by default and
          are never part of Circle. Only things you choose to share, like a training milestone, will
          ever leave your own space.
        </p>
      </Panel>
    </>
  );
}
