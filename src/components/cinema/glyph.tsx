/**
 * The assistant signal's authored mark: a V (for VAYVOR) opening like a lens, a core of light in its mouth and a
 * horizon arc above. Colour and light behaviour come from the surrounding scene; skins can replace the shell later.
 */
export function SignalGlyph({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path className="sg-arc" d="M7.5 7.2a9.4 9.4 0 0 1 13 0" />
      <path className="sg-v" d="M6.5 11.5 14 22l7.5-10.5" />
      <circle className="sg-core" cx="14" cy="12.6" r="2.3" />
    </svg>
  );
}
