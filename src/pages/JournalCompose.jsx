import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useContacts } from '../hooks/useContacts'
import MentionInput from '../components/MentionInput'
import MarkdownText from '../components/MarkdownText'
import { ArrowLeft } from '../components/icons'

const DRAFT_KEY = 'proxima:journal-draft'
const DRAFT_TAGS_KEY = 'proxima:journal-draft-tags'

function loadDraft() {
  try { return sessionStorage.getItem(DRAFT_KEY) || '' } catch { return '' }
}
function loadDraftTags() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_TAGS_KEY) || '[]') } catch { return [] }
}

const dedupe = (arr) => [...new Map(arr.map((c) => [c.id, c])).values()]

export default function JournalCompose() {
  const navigate = useNavigate()
  const { contacts, fetch: fetchContacts } = useContacts()
  const [text, setText] = useState(loadDraft)
  const [tagged, setTagged] = useState(loadDraftTags)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, text)
      sessionStorage.setItem(DRAFT_TAGS_KEY, JSON.stringify(tagged))
    } catch { /* quota exceeded — ignore */ }
  }, [text, tagged])

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

      sessionStorage.removeItem(DRAFT_KEY)
      sessionStorage.removeItem(DRAFT_TAGS_KEY)
      navigate('/journal')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate('/journal')} className="grid size-9 place-items-center rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">New Entry</h1>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        {/* Write / Preview toggle */}
        <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${!preview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${preview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Preview
          </button>
        </div>

        {preview ? (
          <div className="min-h-[8rem] rounded-xl border border-gray-100 bg-gray-50 p-4">
            {text.trim() ? (
              <div className="whitespace-pre-wrap"><MarkdownText>{text}</MarkdownText></div>
            ) : (
              <p className="text-gray-400">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <MentionInput
            value={text}
            onChange={(v) => { setText(v); setError(null) }}
            contacts={contacts}
            onSelect={(c) => setTagged((t) => [...t, c])}
            toolbar
            rows={8}
          />
        )}

        {tagged.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dedupe(tagged).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                @{c.name}
                <button onClick={() => setTagged((t) => t.filter((x) => x.id !== c.id))} className="text-violet-400 hover:text-violet-800">x</button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Type <span className="font-medium text-violet-600">@</span> to tag a contact
            <span className="mx-1.5">|</span>
            <span className="font-medium">**bold**</span> <span className="font-medium">*italic*</span> <span className="font-medium">[link](url)</span>
          </p>
          <button onClick={post} disabled={saving || !text.trim()} className="btn px-6">
            {saving ? 'Saving...' : 'Post'}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
