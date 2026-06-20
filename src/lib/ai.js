import { supabase } from './supabase'

// Thin client over the `ai` Edge Function. Each call sends only the fields the
// model needs (smaller payload, less data leaving the device).
async function call(action, payload) {
  const { data, error } = await supabase.functions.invoke('ai', { body: { action, ...payload } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

const slim = (c) => ({ id: c.id, name: c.name, role: c.role, company: c.company, city: c.city, tags: c.tags, notes: c.notes })

export const aiSearch = (query, contacts) => call('search', { query, contacts: contacts.map(slim) })
export const aiBrief = (contact, timeline) => call('brief', { contact: slim(contact), timeline })
export const aiParse = (prose, contacts) => call('parse', { prose, contacts: contacts.map((c) => ({ id: c.id, name: c.name, role: c.role, company: c.company })) })
