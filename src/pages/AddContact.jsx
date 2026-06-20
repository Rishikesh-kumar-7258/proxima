import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { geocodeCity } from '../lib/geocode'
import { useContacts } from '../hooks/useContacts'
import TagInput from '../components/TagInput'

const EMPTY = {
  name: '', phone: '', email: '', role: '', company: '', industry: '',
  city: '', how_met: '', food_prefs: '', notes: '', tags: [],
}

export default function AddContact() {
  const { id } = useParams() // present → edit an existing contact
  const navigate = useNavigate()
  const { fetch, remove } = useContacts()
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null) // pending File, uploaded on save
  const [saving, setSaving] = useState(false)

  // Edit mode: hydrate the form from the row.
  useEffect(() => {
    if (!id) return
    supabase.from('contacts').select('*').eq('id', id).single()
      .then(({ data }) => data && setForm({ ...EMPTY, ...data }))
  }, [id])

  // Show the freshly picked file, else the saved photo. Memoised so we make one blob URL.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : form.photo_url), [photo, form.photo_url])

  const field = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Upload the photo into the user's own folder, then store its public URL.
    let photo_url = form.photo_url
    if (photo) {
      const path = `${user.id}/${crypto.randomUUID()}`
      await supabase.storage.from('avatars').upload(path, photo, { upsert: true })
      photo_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    // Turn the city into map coordinates (best-effort; null if it can't be resolved).
    const { name, phone, email, role, company, industry, city, how_met, food_prefs, notes, tags } = form
    const geo = await geocodeCity(city)

    // Send only editable columns; undefined id lets Postgres generate one on insert.
    await supabase.from('contacts').upsert({
      id: form.id, user_id: user.id, name, phone, email, role, company, industry,
      city, how_met, food_prefs, notes, tags, photo_url,
      lat: geo?.lat ?? form.lat ?? null, lng: geo?.lng ?? form.lng ?? null,
    })

    await fetch()
    navigate('/')
  }

  const del = async () => {
    if (!confirm('Delete this contact?')) return
    await remove(id)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-violet-600 hover:text-violet-700">
            ← Back to contacts
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{id ? 'Edit contact' : 'New contact'}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-violet-100 px-3 py-1.5 font-medium text-violet-700">Profile</span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600">Professional</span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600">Personal</span>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm md:p-5 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Profile setup</p>

            <label className="group cursor-pointer">
              {preview ? (
                <img src={preview} alt="" className="size-24 rounded-full object-cover ring-4 ring-white shadow-lg transition group-hover:scale-[1.01]" />
              ) : (
                <div className="grid size-24 place-items-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 ring-4 ring-white shadow-lg transition group-hover:bg-violet-200">
                  Add photo
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} className="hidden" />
            </label>

            <div className="w-full space-y-2 text-left">
              <input required placeholder="Full name" {...field('name')} className="input text-center text-lg font-medium" />
            </div>

            <div className="grid w-full gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                <span className="block font-medium text-gray-900">Map</span>
                <span className="block text-gray-500">City drives location</span>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                <span className="block font-medium text-gray-900">Search</span>
                <span className="block text-gray-500">Tags improve recall</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:p-6 lg:p-8">
          <Section title="Contact details">
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder="Phone" inputMode="tel" {...field('phone')} className="input" />
              <input placeholder="Email" type="email" {...field('email')} className="input" />
            </div>
          </Section>

          <Section title="Professional context">
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder="Role" {...field('role')} className="input" />
              <input placeholder="Company" {...field('company')} className="input" />
            </div>
            <input placeholder="Industry" {...field('industry')} className="input" />
            <div>
              <p className="mb-1.5 text-sm text-gray-500">Expertise tags</p>
              <TagInput value={form.tags ?? []} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            </div>
          </Section>

          <Section title="Personal notes">
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder="City" {...field('city')} className="input" />
              <input placeholder="How you met" {...field('how_met')} className="input" />
            </div>
            <input placeholder="Food preferences" {...field('food_prefs')} className="input" />
            <textarea placeholder="Notes" rows={5} {...field('notes')} className="input resize-none" />
          </Section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {id && (
                <button type="button" onClick={del} className="text-sm font-medium text-red-600 hover:text-red-700">
                  Delete contact
                </button>
              )}
              <button disabled={saving} className="btn w-full sm:w-auto sm:min-w-40">{saving ? 'Saving…' : 'Save contact'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

// Labelled group of fields.
function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</h2>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
