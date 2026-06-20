// Relationship warmth derived purely from days since the last logged interaction
// (spec §6.5). No AI, no manual field — it falls as you stop logging someone.
export function warmthOf(lastInteraction) {
  if (!lastInteraction) return 'cold'
  const days = (Date.now() - new Date(lastInteraction).getTime()) / 86_400_000
  if (days <= 14) return 'hot'
  if (days <= 60) return 'warm'
  return 'cold'
}
