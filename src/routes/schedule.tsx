import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL kept so bookmarks and installed shortcuts still land somewhere sensible.
export const Route = createFileRoute("/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/plan", replace: true });
  },
});
