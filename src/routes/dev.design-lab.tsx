import { createFileRoute, notFound } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

// Development only: in a production build `import.meta.env.DEV` is false, the lazy import below is
// dead code (no chunk is emitted) and the route 404s.
const Lab = import.meta.env.DEV ? lazy(() => import("@/components/living/design-lab")) : null;

export const Route = createFileRoute("/dev/design-lab")({
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
