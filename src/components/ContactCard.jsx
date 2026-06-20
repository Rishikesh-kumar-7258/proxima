import { Link } from 'react-router-dom'
import { warmthOf } from '../lib/warmth'

const warmthDot = { hot: 'bg-green-500', warm: 'bg-amber-500', cold: 'bg-gray-400' }
const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export default function ContactCard({ contact }) {
  const { name, role, company, city, tags, photo_url, last_interaction } = contact
  return (
    <Link to={`/contact/${contact.id}`} className="card flex items-center gap-3 p-3">
      {/* Photo, or initials fallback */}
      {photo_url ? (
        <img src={photo_url} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-gray-100" />
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-100 font-semibold text-violet-700 ring-2 ring-violet-50">
          {initials(name)}
        </div>
      )}

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${warmthDot[warmthOf(last_interaction)]}`} />
          <p className="truncate font-semibold">{name}</p>
        </div>
        {(role || company || city) && (
          <p className="truncate text-sm text-gray-500">
            {[role, company].filter(Boolean).join(' · ')}{city && ` — ${city}`}
          </p>
        )}
        {tags?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>
            ))}
            {tags.length > 3 && <span className="px-1 text-xs text-gray-400">+{tags.length - 3}</span>}
          </div>
        )}
      </div>

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-gray-300">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  )
}
