import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { aiSearch } from '../lib/ai'
import ContactCard from '../components/ContactCard'
import { Search, Plus, Users, Sparkles } from '../components/icons'

export default function ContactList() {
  const { contacts, loading, fetch } = useContacts()
  const [q, setQ] = useState('')
  const [ask, setAsk] = useState(false) // false = instant filter, true = AI question
  const [ai, setAi] = useState(null) // { matches } | null
  const [asking, setAsking] = useState(false)

  useEffect(() => { fetch() }, [fetch])

  // Instant, offline filter across name, role, company, city and expertise tags.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return contacts
    return contacts.filter((c) =>
      [c.name, c.role, c.company, c.city,
       ...(c.addresses?.map((a) => a.city) ?? []),
       ...(c.tags ?? [])]
        .filter(Boolean).join(' ').toLowerCase().includes(needle),
    )
  }, [q, contacts])

  const runAsk = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setAsking(true)
    try {
      const { matches } = await aiSearch(q, contacts)
      const byId = Object.fromEntries(contacts.map((c) => [c.id, c]))
      setAi(matches.map((m) => ({ ...byId[m.id], reason: m.reason })).filter((c) => c.id))
    } catch {
      setAi('error')
    }
    setAsking(false)
  }

  const switchMode = (next) => { setAsk(next); setQ(''); setAi(null) }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        </div>
        {!loading && (
          <div className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            {contacts.length} total
          </div>
        )}
      </div>

      {/* Mode toggle: deterministic filter vs natural-language AI search */}
      <div className="mb-3 inline-flex rounded-xl bg-gray-100 p-1 text-sm">
        <button onClick={() => switchMode(false)} className={`rounded-lg px-3 py-1.5 font-medium ${!ask ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Filter</button>
        <button onClick={() => switchMode(true)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${ask ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'}`}><Sparkles className="size-4" /> Ask AI</button>
      </div>

      <form onSubmit={runAsk} className="relative mb-5 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ask ? 'Who do I know in fintech near Pune…?' : 'Search name, role or skill…'}
            className="input pl-10"
          />
        </div>
        {ask && <button disabled={asking} className="btn shrink-0 px-5">{asking ? 'Thinking…' : 'Ask'}</button>}
      </form>

      {loading ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <li key={i} className="h-[5rem] animate-pulse rounded-2xl bg-gray-100" />)}
        </ul>
      ) : ask ? (
        <AiResults ai={ai} asking={asking} />
      ) : filtered.length === 0 ? (
        <Empty searching={!!q} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => <li key={c.id}><ContactCard contact={c} /></li>)}
        </ul>
      )}
    </div>
  )
}

// Results for the AI question mode, each annotated with the model's reason.
function AiResults({ ai, asking }) {
  if (asking) return <p className="py-8 text-center text-gray-400">Searching your network…</p>
  if (ai === null) return <p className="py-8 text-center text-gray-400">Ask a question in plain English — e.g. “who can introduce me to investors?”</p>
  if (ai === 'error') return <p className="py-8 text-center text-gray-400">AI search failed — make sure the <code>ai</code> Edge Function is deployed.</p>
  if (ai.length === 0) return <p className="py-8 text-center text-gray-400">No one in your network seems to match.</p>
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {ai.map((c) => (
        <li key={c.id} className="flex flex-col gap-2">
          <ContactCard contact={c} />
          <p className="px-1 text-sm text-violet-700">{c.reason}</p>
        </li>
      ))}
    </ul>
  )
}

// Empty / no-results state with a clear call to action.
function Empty({ searching }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600">
        <Users className="size-8" />
      </div>
      <p className="max-w-xs text-gray-500">
        {searching ? 'No matches found.' : 'Your network is empty. Add your first contact to get started.'}
      </p>
      {!searching && <Link to="/add" className="btn px-6"><Plus className="size-5" /> Add a contact</Link>}
    </div>
  )
}
