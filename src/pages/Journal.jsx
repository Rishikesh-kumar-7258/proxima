import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useContacts } from '../hooks/useContacts'
import MentionInput from '../components/MentionInput'
import { Flame } from '../components/icons'

const iso = (d) => d.toISOString().slice(0, 10)

export default function Journal() {
  const { contacts, fetch: fetchContacts } = useContacts()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [tagged, setTagged] = useState([]) // contacts to link — from @mention or AI parse
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Central journal + each entry's linked contacts, newest first (one nested query).
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

  const post = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const linked = dedupe(tagged)

      const { data: entry, error: insertError } = await supabase
        .from('journal_entries')
        .insert({ user_id: user.id, content: text.trim() })
        .select('id')
        .single()

      if (insertError || !entry) {
        setError('Could not save entry. Please try again.')
        return
      }

      if (linked.length) {
        await supabase.from('journal_contact_links').insert(
          linked.map((c) => ({ journal_id: entry.id, contact_id: c.id, location_mentioned: c.city ?? null })),
        )
        await supabase.from('contacts').update({ last_interaction: new Date().toISOString() })
          .in('id', linked.map((c) => c.id))
        fetchContacts()
      }

      setText(''); setTagged([])
      load()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
          <p className="text-sm text-gray-400">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-600">
            <Flame className="size-4" /> {streak}-day streak
          </span>
        )}
      </div>

      {/* Composer */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <MentionInput value={text} onChange={(v) => { setText(v); setError(null) }} contacts={contacts} onSelect={(c) => setTagged((t) => [...t, c])} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Type <span className="font-medium text-violet-600">@</span> to tag a contact</p>
          <button onClick={post} disabled={saving || !text.trim()} className="btn px-5">{saving ? 'Saving…' : 'Post'}</button>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Central log */}
      {loading ? (
        <p className="py-8 text-center text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No entries yet. Write your first above.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="mb-1 text-xs text-gray-400">{fmtDate(e.date)}</p>
              <p className="whitespace-pre-wrap">{e.content}</p>
              {e.journal_contact_links?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
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

// Consecutive days with an entry, counting back from today (or yesterday).
function streakFrom(dates) {
  const set = new Set(dates)
  const d = new Date()
  if (!set.has(iso(d))) {
    d.setDate(d.getDate() - 1)
    if (!set.has(iso(d))) return 0 // streak already broken
  }
  let n = 0
  while (set.has(iso(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

const dedupe = (arr) => [...new Map(arr.map((c) => [c.id, c])).values()]
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
