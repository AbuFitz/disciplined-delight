import { applyUpdate, usePwa } from "@/lib/pwa";
import { useActiveSession } from "@/data/session-hooks";
import { Button } from "./ui";

/** Offers a waiting update. Never reloads by itself, and holds back while a workout is in progress. */
export function UpdateBanner() {
  const { waiting } = usePwa();
  const session = useActiveSession();
  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(0.5rem+var(--safe-top))] z-[55] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-line bg-popover px-4 py-2.5 shadow-xl lg:left-[16.5rem]"
    >
      <p className="text-sm">
        {session ? "An update is ready. Finish your session first." : "A new version is ready."}
      </p>
      <Button size="sm" variant="primary" disabled={!!session} onClick={applyUpdate}>
        Update
      </Button>
    </div>
  );
}
