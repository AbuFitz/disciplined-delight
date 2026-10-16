/** Builds the display text for a prescription, keeping any trailing qualifier from the original ("per arm"). */
export function schemeFrom(
  sets: number,
  repMin: number,
  repMax: number,
  previous?: string,
): string {
  const suffix = previous?.match(/^\s*\d+\s*[×x]\s*\d+(?:\s*[–-]\s*\d+)?\s*(.*)$/i)?.[1]?.trim();
  const reps = repMin === repMax ? `${repMin}` : `${repMin}–${repMax}`;
  return `${sets} × ${reps}${suffix ? ` ${suffix}` : ""}`;
}
