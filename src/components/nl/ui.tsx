import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Check, Minus, Plus, X } from "lucide-react";
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------ Buttons ------------------------------ */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg" | "sm";
  busy?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "secondary", size = "md", className, busy, children, disabled, ...p },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-2 rounded-full text-center font-medium select-none",
        "transition-[transform,background-color,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
        size === "lg" && "min-h-[3.25rem] px-7 text-base",
        size === "md" && "min-h-11 px-5 text-[0.95rem]",
        size === "sm" && "min-h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:brightness-110",
        variant === "secondary" &&
          "border border-input bg-transparent text-foreground hover:bg-surface-2",
        variant === "ghost" && "text-foreground hover:bg-surface-2",
        variant === "danger" &&
          "border border-destructive/50 text-destructive hover:bg-destructive/10",
        className,
      )}
      {...p}
    >
      {busy ? "Saving…" : children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, className, children, ...p }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-foreground transition active:scale-95 hover:bg-surface-2 disabled:opacity-40",
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
});

/* ------------------------------ Type & layout ------------------------------ */
export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("eyebrow", className)}>{children}</p>
);

export function PageHeader({
  eyebrow,
  title,
  actions,
  sub,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-8">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="display-title text-[2.35rem] md:text-6xl">{title}</h1>
        {sub && <p className="mt-3 max-w-xl text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  tone = "plain",
  className,
  children,
  as: As = "section",
  ...p
}: {
  tone?: "plain" | "green" | "dusk" | "warm";
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        "rounded-3xl border border-line p-5 md:p-6",
        tone === "plain" && "bg-surface",
        tone === "green" && "bg-[image:var(--panel-green)]",
        tone === "dusk" && "bg-[image:var(--panel-dusk)]",
        tone === "warm" && "bg-[image:var(--panel-warm)]",
        className,
      )}
      {...(p as object)}
    >
      {children}
    </As>
  );
}

export const Rule = ({ className }: { className?: string }) => (
  <hr className={cn("border-0 border-t border-line", className)} />
);

export function Row({
  children,
  className,
  onClick,
  as,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "li";
}) {
  const Tag = (onClick ? "button" : (as ?? "div")) as "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 border-t border-line py-3 text-left first:border-t-0",
        onClick && "active:bg-surface-2/60",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

export function Chip({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "info";
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "border-line text-muted-foreground",
        tone === "ok" && "border-ok/40 text-ok",
        tone === "warn" && "border-warn/50 text-warn",
        tone === "info" && "border-line bg-surface-2 text-foreground",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------ Progress ------------------------------ */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const pct = max && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max ?? undefined}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 overflow-hidden rounded-full bg-foreground/10", className)}
    >
      <div
        className="h-full rounded-full bg-spring transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------ Form controls ------------------------------ */
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  const auto = useId();
  const hintId = `${auto}-hint`;
  // Link the label to its control even when the caller didn't pass an id.
  const child =
    !htmlFor &&
    isValidElement<{ id?: string; "aria-describedby"?: string }>(children) &&
    !children.props.id
      ? cloneElement(children, { id: auto, "aria-describedby": hint || error ? hintId : undefined })
      : children;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor ?? auto} className="text-sm font-medium">
        {label}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={hintId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-2xl border border-input bg-surface-2/50 px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-ring";

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...p }, ref) {
    return <input ref={ref} className={cn(inputCls, className)} {...p} />;
  },
);
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(inputCls, "min-h-24 py-3", className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...p }, ref) {
    return <select ref={ref} className={cn(inputCls, "appearance-auto", className)} {...p} />;
  },
);

/** Numeric field with draft text (so "7." works) and optional stepper. */
export function NumberField({
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
  max,
  placeholder,
  label,
  stepper = true,
  decimals = 2,
  className,
  id,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  label: string;
  stepper?: boolean;
  decimals?: number;
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  useEffect(() => {
    setDraft((d) =>
      Number(d) === value || (d === "" && value == null) ? d : value == null ? "" : String(value),
    );
  }, [value]);
  const commit = (s: string) => {
    setDraft(s);
    if (s.trim() === "") return onChange(undefined);
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n)) onChange(n);
  };
  const bump = (dir: 1 | -1) => {
    const base = value ?? (Number(placeholder) || 0);
    const next = Math.round((base + dir * step) * 10 ** decimals) / 10 ** decimals;
    const clamped = Math.max(min, max != null ? Math.min(max, next) : next);
    setDraft(String(clamped));
    onChange(clamped);
  };
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {stepper && (
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => bump(-1)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-input active:scale-95"
        >
          <Minus className="size-4" />
        </button>
      )}
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          aria-label={label}
          inputMode="decimal"
          enterKeyHint="done"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => commit(e.target.value)}
          onFocus={(e) => e.target.select()}
          className={cn(inputCls, "tnum text-center", unit && "pr-9")}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {stepper && (
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => bump(1)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-input active:scale-95"
        >
          <Plus className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap rounded-3xl border border-line bg-surface p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 rounded-full px-4 text-sm font-medium transition",
            o.value === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Square check control: state is shown by icon and shape as well as colour. */
export function CheckButton({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border-2 transition active:scale-90",
        size === "lg" ? "size-12" : "size-11",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-transparent",
      )}
    >
      <Check className="size-5" strokeWidth={3} />
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-1">
      <div>
        <label id={id} className="font-medium">
          {label}
        </label>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-11 w-16 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "relative block h-8 w-14 rounded-full border transition",
            checked ? "border-primary bg-primary" : "border-input bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-6 rounded-full transition-all",
              checked ? "left-[1.6rem] bg-primary-foreground" : "left-0.5 bg-foreground/70",
            )}
          />
        </span>
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

/* ------------------------------ Sheet & dialogs ------------------------------ */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "fixed z-50 flex max-h-[92dvh] flex-col overflow-hidden border border-line bg-popover text-popover-foreground shadow-2xl outline-none",
            "inset-x-0 bottom-0 rounded-t-[1.75rem] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            "md:inset-y-3 md:right-3 md:left-auto md:bottom-3 md:max-h-none md:rounded-3xl md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right",
            wide ? "md:w-[40rem]" : "md:w-[30rem]",
          )}
        >
          <div
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20 md:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3 md:px-6 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl font-semibold leading-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close" className="-mr-2 -mt-1">
                <X className="size-5" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6">
            {children}
          </div>
          {footer && (
            <div className="shrink-0 border-t border-line bg-popover px-5 pb-[calc(1rem+var(--safe-bottom))] pt-3 md:px-6">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  tone?: "danger" | "primary";
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-popover p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0">
          <AlertDialog.Title className="font-display text-xl font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-muted-foreground">{body}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={() => onConfirm()}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ------------------------------ Menu ------------------------------ */
import * as DM from "@radix-ui/react-dropdown-menu";
export function Menu({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  label: string;
  items: { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          aria-label={label}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2 active:scale-95"
        >
          {trigger}
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={6}
          className="z-[70] min-w-52 rounded-2xl border border-line bg-popover p-1.5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items.map((it) => (
            <DM.Item
              key={it.label}
              disabled={it.disabled}
              onSelect={it.onSelect}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-40",
                it.danger && "text-destructive",
              )}
            >
              {it.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
