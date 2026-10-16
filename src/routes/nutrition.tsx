import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL kept so bookmarks and installed shortcuts still land somewhere sensible.
export const Route = createFileRoute("/nutrition")({
  beforeLoad: () => {
    throw redirect({ to: "/food", replace: true });
  },
});
