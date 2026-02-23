export function fmtPct(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function fmtCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
