import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet } from "@/components/nl/ui";
import { VIcon, type VIconName } from "@/components/nl/icon";
import { useAgenda } from "@/data/agenda";
import "./cinema.css";
import "./app.css";

const ACTIONS: { to: string; label: string; hint: string; icon: VIconName }[] = [
  {
    to: "/train",
    label: "Start or review training",
    hint: "Today's session and the week",
    icon: "training",
  },
  { to: "/food", label: "Log a meal", hint: "One tap, or add what you ate", icon: "nutrition" },
  { to: "/plan", label: "Plan the week", hint: "Move, add or pause activities", icon: "calendar" },
  {
    to: "/settings",
    label: "Assistant and Buddy settings",
    hint: "Presence, tone, haptics, quiet hours",
    icon: "settings",
  },
];

/**
 * A small, optional assistant entry. It never floats over content: it lives in the header (mobile) or the sidebar
 * (desktop). Today it offers real shortcuts. Describing a change in words is NOT connected yet and is labelled so;
 * when it is, every change will show a preview and ask before it applies, with undo.
 */
export function AssistantEntry({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [open, setOpen] = useState(false);
  const ag = useAgenda();
  const next = ag.ready ? ag.next : null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Assistant"
        className={variant === "icon" ? "cn-assist-btn" : "cn-assist-row"}
      >
        <span className="cn-assist-ico">
          <VIcon name="buddy" size={20} />
        </span>
        {variant === "row" && <span>Assistant</span>}
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Assistant"
        description="Shortcuts now. Describing a change in words is coming."
      >
        <div className="cn-lens">
          <p className="cn-lens-now">
            <span className="cn-lens-k">What's next</span>
            <span className="cn-lens-v">
              {next ? next.label : ag.ready ? "Nothing left today" : "Loading"}
            </span>
          </p>
          <ul className="cn-lens-list">
            {ACTIONS.map((a) => (
              <li key={a.to}>
                <Link to={a.to} onClick={() => setOpen(false)} className="cn-lens-row">
                  <span className="cn-lens-ico">
                    <VIcon name={a.icon} size={20} />
                  </span>
                  <span className="cn-lens-t">
                    <span>{a.label}</span>
                    <small>{a.hint}</small>
                  </span>
                  <VIcon name="next" size={16} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="cn-lens-note">
            Not connected yet: saying or typing a change such as "I only have 30 minutes" to rewrite
            a session. When it is, it will show you the change, ask before applying it, and let you
            undo it.
          </p>
        </div>
      </Sheet>
    </>
  );
}
