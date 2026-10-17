import {
  Warning,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDots,
  Check,
  CaretDown,
  CaretLeft,
  CaretRight,
  Barbell,
  ArrowSquareOut,
  Flag,
  Heart,
  Books,
  ChartLineUp,
  ListChecks,
  DotsThree,
  Pause,
  Play,
  Minus,
  Plus,
  ArrowsClockwise,
  MagnifyingGlass,
  GearSix,
  SkipForward,
  Sparkle,
  Note,
  Timer,
  Trash,
  X,
  ForkKnife,
  HouseLine,
  Brain,
  UsersThree,
  MoonStars,
  SpotifyLogo,
  AppleLogo,
  type Icon,
} from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const icons = {
  alert: Warning,
  archive: Archive,
  back: ArrowLeft,
  calendar: CalendarDots,
  check: Check,
  collapse: CaretDown,
  previous: CaretLeft,
  next: CaretRight,
  down: ArrowDown,
  up: ArrowUp,
  training: Barbell,
  external: ArrowSquareOut,
  finish: Flag,
  favourite: Heart,
  library: Books,
  progress: ChartLineUp,
  checklist: ListChecks,
  more: DotsThree,
  pause: Pause,
  play: Play,
  minus: Minus,
  add: Plus,
  close: X,
  replace: ArrowsClockwise,
  search: MagnifyingGlass,
  settings: GearSix,
  skip: SkipForward,
  buddy: Sparkle,
  note: Note,
  timer: Timer,
  delete: Trash,
  nutrition: ForkKnife,
  today: HouseLine,
  mind: Brain,
  community: UsersThree,
  spirituality: MoonStars,
  spotify: SpotifyLogo,
  appleMusic: AppleLogo,
} as const satisfies Record<string, Icon>;

export type VIconName = keyof typeof icons | "readiness" | "adaptation";

const customPath: Record<"readiness" | "adaptation", ReactNode> = {
  readiness: <path d="M3 13h3l2-6 4 11 3-8 2 3h4" />,
  adaptation: <path d="M4 8h10m0 0-3-3m3 3-3 3m9 5H10m0 0 3-3m-3 3 3 3" />,
};

/** The only icon entry point for core VAYVOR UI. Decorative icons are hidden by default. */
export function VIcon({
  name,
  size = 20,
  label,
  className,
  strokeWidth = 1.8,
  active = false,
}: {
  name: VIconName;
  size?: 16 | 18 | 20 | 24 | 28;
  label?: string;
  className?: string;
  strokeWidth?: 1.5 | 1.8 | 2 | 2.5;
  active?: boolean;
}) {
  const titleId = useId();
  if (name === "readiness" || name === "adaptation")
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={label ? undefined : true}
        aria-labelledby={label ? titleId : undefined}
        className={cn("shrink-0", className)}
      >
        {label && <title id={titleId}>{label}</title>}
        {customPath[name]}
      </svg>
    );
  const Icon = icons[name];
  return (
    <Icon
      size={size}
      weight={active ? "bold" : "regular"}
      aria-hidden={label ? undefined : true}
      aria-labelledby={label ? titleId : undefined}
      className={cn("shrink-0", className)}
    >
      {label && <title id={titleId}>{label}</title>}
    </Icon>
  );
}
