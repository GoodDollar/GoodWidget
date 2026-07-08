// Keeps only digits and a single decimal point so the value is always safe to
// pass to viem's parseUnits (which throws on "1.2.3", "1e6", separators, etc.).
// Shared by the view (input onChange) and the adapter (setMaxAmount) so both
// entry points produce parseUnits-safe values.
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}
