import { createFileRoute, notFound } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

// Development only: in a production build `import.meta.env.DEV` is false, the lazy import is dead code
// (no lab chunk is emitted) and the route renders the 404 page.
const Lab = import.meta.env.DEV ? lazy(() => import("@/components/experience/lab")) : null;

export const Route = createFileRoute("/dev/experience-lab")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () =>
    Lab ? (
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    ) : null,
});
