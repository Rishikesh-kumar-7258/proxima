import MarkdownText from './MarkdownText'

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function TimelineEntry({ entry }) {
  const { journal, location_mentioned, created_at } = entry
  return (
    <li className="relative border-l-2 border-violet-100 pb-1 pl-4">
      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-violet-500" />
      <p className="text-xs text-gray-400">{fmt(journal?.date ?? created_at)}</p>
      {journal?.content && <div className="whitespace-pre-wrap"><MarkdownText>{journal.content}</MarkdownText></div>}
      {location_mentioned && <p className="mt-0.5 text-xs text-gray-400">📍 {location_mentioned}</p>}
    </li>
  )
}
