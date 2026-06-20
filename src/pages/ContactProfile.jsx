import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aiBrief } from '../lib/ai'
import WarmthBadge from '../components/WarmthBadge'
import TimelineEntry from '../components/TimelineEntry'
import ArcChart from '../components/ArcChart'
import { Sparkles } from '../components/icons'

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export default function ContactProfile() {
  const { id } = useParams()
  const [contact, setContact] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [brief, setBrief] = useState(null)
  const [briefing, setBriefing] = useState(false)

  useEffect(() => {
    (async () => {
      // Profile + the contact's slice of the journal, in parallel.
      const [{ data: c }, { data: t }] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', id).single(),
        supabase.from('journal_contact_links')
          .select('id, location_mentioned, created_at, journal:journal_entries(content, date)')
          .eq('contact_id', id)
          .order('created_at', { ascending: false }),
      ])
      setContact(c); setTimeline(t ?? []); setLoading(false)
    })()
  }, [id])

  if (loading) return <Centered>Loading…</Centered>
  if (!contact) return <Centered>Contact not found.</Centered>

  const { name, role, company, city, phone, email, tags, notes, how_met, food_prefs, photo_url, last_interaction } = contact

  // Derived from the timeline — both pure client, no AI.
  const logDates = timeline.map((t) => t.journal?.date).filter(Boolean)
  const locations = timeline.filter((t) => t.location_mentioned)

  const generateBrief = async () => {
    setBriefing(true)
    try {
      const res = await aiBrief(contact, timeline.map((t) => ({ date: t.journal?.date, content: t.journal?.content })))
      setBrief(res.brief)
    } catch {
      setBrief('Could not generate a brief — make sure the `ai` Edge Function is deployed.')
    }
    setBriefing(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-violet-600">← Contacts</Link>
        <Link to={`/contact/${id}/edit`} className="text-sm font-medium text-violet-600">Edit</Link>
      </div>

      <header className="flex flex-col items-center gap-3 text-center">
        {photo_url ? (
          <img src={photo_url} alt="" className="size-24 rounded-full object-cover ring-4 ring-white shadow" />
        ) : (
          <div className="grid size-24 place-items-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-700">
            {initials(name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          {(role || company) && <p className="text-gray-500">{[role, company].filter(Boolean).join(' · ')}</p>}
        </div>
        <WarmthBadge lastInteraction={last_interaction} />
        {tags?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-600">{t}</span>)}
          </div>
        )}
      </header>

      {/* Quick facts */}
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Fact label="City" value={city} />
        <Fact label="Phone" value={phone} />
        <Fact label="Email" value={email} />
        <Fact label="How you met" value={how_met} />
        <Fact label="Food" value={food_prefs} />
      </dl>
      {notes && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-600">{notes}</p>
        </div>
      )}

      {/* Pre-meeting brief (AI, on demand) */}
      <div className="mt-6">
        {brief ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-violet-600"><Sparkles className="size-3.5" /> Pre-meeting brief</p>
            <p className="text-sm text-gray-700">{brief}</p>
          </div>
        ) : (
          <button onClick={generateBrief} disabled={briefing} className="btn-ghost w-full">
            <Sparkles className="size-4 text-violet-600" /> {briefing ? 'Thinking…' : 'Generate pre-meeting brief'}
          </button>
        )}
      </div>

      {/* Relationship arc (no AI) */}
      {logDates.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Relationship arc</h2>
          <ArcChart dates={logDates} />
        </section>
      )}

      {/* Location history (no AI) */}
      {locations.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Location history</h2>
          <ul className="flex flex-col gap-1.5">
            {locations.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>📍 {t.location_mentioned}</span>
                <span className="text-gray-400">{t.journal?.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Per-person timeline */}
      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">Timeline</h2>
      {timeline.length === 0 ? (
        <p className="text-sm text-gray-400">No log entries yet. Mention <span className="font-medium text-violet-600">@{name}</span> in your journal and it appears here.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {timeline.map((e) => <TimelineEntry key={e.id} entry={e} />)}
        </ol>
      )}
    </div>
  )
}

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  )
}

function Centered({ children }) {
  return <div className="grid min-h-[60svh] place-items-center text-gray-400">{children}</div>
}
