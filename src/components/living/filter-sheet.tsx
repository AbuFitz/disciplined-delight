import type { ReactNode } from "react";
import { Button, Sheet } from "@/components/nl/ui";
import { ActionDock } from "./action-dock";
import "./living.css";

export type FilterOption = { value: string; label: string };
export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
};

/**
 * Filters live in a sheet, not on the page, so the Library stays media-first. Options are toggle buttons
 * (aria-pressed, 44px); the dock carries the result count and Clear.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  groups,
  onToggle,
  onClear,
  resultCount,
  extra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  groups: FilterGroup[];
  onToggle: (groupId: string, value: string) => void;
  onClear: () => void;
  resultCount: number;
  extra?: ReactNode;
}) {
  const active = groups.reduce((n, g) => n + g.selected.length, 0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <ActionDock
          label="Filter actions"
          primary={
            <Button variant="primary" className="w-full" onClick={() => onOpenChange(false)}>
              Show {resultCount} {resultCount === 1 ? "result" : "results"}
            </Button>
          }
          secondary={
            <Button variant="ghost" onClick={onClear} disabled={active === 0}>
              Clear{active ? ` (${active})` : ""}
            </Button>
          }
        />
      }
    >
      {groups.map((g) => (
        <fieldset key={g.id} className="lv-fgroup m-0 min-w-0 border-0 p-0">
          <legend className="text-[0.85rem] font-semibold">{g.label}</legend>
          <div className="lv-fopts">
            {g.options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="lv-fopt"
                aria-pressed={g.selected.includes(o.value)}
                onClick={() => onToggle(g.id, o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {extra}
    </Sheet>
  );
}
