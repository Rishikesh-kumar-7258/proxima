import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useContacts } from '../hooks/useContacts'
import MarkdownText from '../components/MarkdownText'
import { Flame, Pen } from '../components/icons'

const iso = (d) => d.toISOString().slice(0, 10)

export default function Journal() {
  const { fetch: fetchContacts } = useContacts()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterPerson, setFilterPerson] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('id, content, date, journal_contact_links(contact:contacts(id, name))')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { (async () => { await fetchContacts(); await load() })() }, [fetchContacts])

  const streak = useMemo(() => streakFrom(entries.map((e) => e.date)), [entries])

  const taggedPeople = useMemo(() => {
    const m = new Map()
    for (const e of entries)
      for (const l of e.journal_contact_links ?? [])
        if (l.contact) m.set(l.contact.id, l.contact.name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [entries])

  const hasFilters = filterPerson || fromDate || toDate

  const filtered = useMemo(() =>
    entries.filter((e) => {
      if (filterPerson && !(e.journal_contact_links ?? []).some((l) => l.contact?.id === filterPerson)) return false
      if (fromDate && e.date < fromDate) return false
      if (toDate && e.date > toDate) return false
      return true
    }),
    [entries, filterPerson, fromDate, toDate],
  )

  const clearFilters = () => { setFilterPerson(''); setFromDate(''); setToDate('') }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
          <p className="text-sm text-gray-400">
            {hasFilters
              ? `${filtered.length} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
              : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-600">
              <Flame className="size-4" /> {streak}-day streak
            </span>
          )}
          <Link to="/journal/new" className="btn px-4 py-2.5 text-sm">
            <Pen className="size-4" /> New Entry
          </Link>
        </div>
      </div>

      {/* Filters */}
      {entries.length > 0 && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-1 flex-col gap-1 sm:min-w-44">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Person</span>
              <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className="input">
                <option value="">Anyone</option>
                {taggedPeople.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">From</span>
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">To</span>
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="input" />
            </label>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-ghost px-4 py-2.5 text-sm">Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <p className="py-8 text-center text-gray-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400">No entries yet.</p>
          <Link to="/journal/new" className="btn mt-4 inline-flex">
            <Pen className="size-4" /> Write your first entry
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No entries match these filters.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((e) => (
            <li key={e.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <p className="mb-1.5 text-xs text-gray-400">{fmtDate(e.date)}</p>
              <div className="whitespace-pre-wrap"><MarkdownText>{e.content}</MarkdownText></div>
              {e.journal_contact_links?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {e.journal_contact_links.map((l) => l.contact && (
                    <Link key={l.contact.id} to={`/contact/${l.contact.id}`} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      @{l.contact.name}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function streakFrom(dates) {
  const set = new Set(dates)
  const d = new Date()
  if (!set.has(iso(d))) {
    d.setDate(d.getDate() - 1)
    if (!set.has(iso(d))) return 0
  }
  let n = 0
  while (set.has(iso(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
