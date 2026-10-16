import { cn } from "@/lib/utils";

/**
 * The VAYVOR wordmark: six solid geometric capitals, drawn as filled paths (no strokes, no font, no gradient)
 * so it reads in one colour, at small embroidery sizes, and on screen. It inherits `currentColor`.
 * Keep the aspect ratio (349:64) and don't recolour individual letters.
 */
const LETTERS = [
  { x: 0, d: "M0 0H14L26 42L38 0H52L32 64H20Z" },
  { x: 58, d: "M0 64L19.5 0H32.5L52 64H38L34.8 53H17.2L14 64ZM21 42H31L26 24Z" },
  { x: 118, d: "M0 0H14L26 22L38 0H52L33 33V64H19V33Z" },
  { x: 178, d: "M0 0H14L26 42L38 0H52L32 64H20Z" },
  {
    x: 237,
    d: "M24 0C40 0 48 12 48 32C48 52 40 64 24 64C8 64 0 52 0 32C0 12 8 0 24 0ZM24 12C17 12 13 19 13 32C13 45 17 52 24 52C31 52 35 45 35 32C35 19 31 12 24 12Z",
  },
  {
    x: 299,
    d: "M0 0H26C41 0 48 9 48 20C48 30 42 37 33 39L50 64H35L21 42H13V64H0ZM13 12V31H25C31 31 35 28 35 21.5C35 15 31 12 25 12Z",
  },
];

export function Wordmark({ className, label = "VAYVOR" }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 349 64"
      role="img"
      aria-label={label}
      className={cn("block h-[1em] w-auto", className)}
      fill="currentColor"
      fillRule="evenodd"
    >
      {LETTERS.map((l) => (
        <path key={l.x} transform={`translate(${l.x} 0)`} d={l.d} />
      ))}
    </svg>
  );
}

/** The V on its own, for avatars, favicons and tight spaces. */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 349 64"
      role="img"
      aria-label="VAYVOR"
      className={cn("block h-[1em] w-auto", className)}
      fill="currentColor"
    >
      <path d="M0 0H14L26 42L38 0H52L32 64H20Z" />
    </svg>
  );
}
