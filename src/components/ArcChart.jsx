// Relationship arc — log frequency per month. Pure client (spec: SQL/deterministic,
// no AI): given a list of 'YYYY-MM-DD' dates, draw a small 6-month bar chart.
export default function ArcChart({ dates }) {
  const months = lastMonths(6)
  const counts = months.map((m) => dates.filter((d) => d?.startsWith(m)).length)
  const max = Math.max(1, ...counts)

  return (
    <div className="flex h-24 items-end gap-2">
      {months.map((m, i) => (
        <div key={m} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end rounded bg-gray-100">
            <div
              className="w-full rounded bg-violet-400"
              style={{ height: `${(counts[i] / max) * 100}%` }}
              title={`${counts[i]} in ${m}`}
            />
          </div>
          <span className="text-[10px] text-gray-400">{monthLabel(m)}</span>
        </div>
      ))}
    </div>
  )
}

// The trailing n months as 'YYYY-MM', oldest first.
function lastMonths(n) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}
const monthLabel = (m) => new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'short' })
