import { createFileRoute } from "@tanstack/react-router";
import { CheckInPanel, FocusPanel, MindHistory, ReflectPanel } from "@/components/nl/mind";
import { PageHeader, Segmented } from "@/components/nl/ui";
import { useToday } from "@/data/hooks";
import { useState } from "react";

export const Route = createFileRoute("/mind")({
  component: MindPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: "checkin" | "reflect" | "focus" | "history" } =>
    s.tab === "checkin" || s.tab === "reflect" || s.tab === "focus" || s.tab === "history"
      ? { tab: s.tab }
      : {},
});

function MindPage() {
  const date = useToday();
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const [fallback] = useState<"checkin">("checkin");
  const tab = search.tab ?? fallback;
  return (
    <>
      <PageHeader title="Mind" sub="Private to you." />
      <div className="mb-5">
        <Segmented
          label="Mind"
          value={tab}
          onChange={(v) => nav({ search: v === "checkin" ? {} : { tab: v } })}
          options={[
            { value: "checkin", label: "Check-in" },
            { value: "reflect", label: "Reflect" },
            { value: "focus", label: "Focus" },
            { value: "history", label: "History" },
          ]}
        />
      </div>
      {tab === "checkin" && <CheckInPanel date={date} />}
      {tab === "reflect" && <ReflectPanel date={date} space="mind" />}
      {tab === "focus" && <FocusPanel date={date} />}
      {tab === "history" && <MindHistory space="mind" />}
    </>
  );
}
