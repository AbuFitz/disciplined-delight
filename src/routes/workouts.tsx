import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL kept so bookmarks and installed shortcuts still land somewhere sensible.
export const Route = createFileRoute("/workouts")({
  beforeLoad: () => {
    throw redirect({ to: "/train", replace: true });
  },
});
