import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Shared contacts cache. RLS scopes every query to the signed-in user, so a plain
// select returns only their rows — no user_id filter needed here.
export const useContacts = create((set, get) => ({
  contacts: [],
  loading: true,

  fetch: async () => {
    const { data } = await supabase.from('contacts').select('*').order('name')
    set({ contacts: data ?? [], loading: false })
  },

  // Delete, then optimistically drop it from the cache so the list updates instantly.
  remove: async (id) => {
    await supabase.from('contacts').delete().eq('id', id)
    set({ contacts: get().contacts.filter((c) => c.id !== id) })
  },
}))
