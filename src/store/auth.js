import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Global auth state. `loading` covers the initial session lookup so the UI never flickers.
export const useAuth = create(() => ({
  session: null,
  loading: true,
  signOut: () => supabase.auth.signOut(),
}))

// Hydrate once from any persisted session...
supabase.auth.getSession().then(({ data }) =>
  useAuth.setState({ session: data.session, loading: false }),
)

// ...then let Supabase push every future login/logout straight into the store.
supabase.auth.onAuthStateChange((_event, session) =>
  useAuth.setState({ session, loading: false }),
)
