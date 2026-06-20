import { createClient } from '@supabase/supabase-js'

// One shared browser client. Keys come from .env (Vite exposes only VITE_* to the client).
// New Supabase projects issue a publishable key (sb_publishable_...); fall back to the
// legacy anon key so existing .env files keep working during the migration window.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
)
