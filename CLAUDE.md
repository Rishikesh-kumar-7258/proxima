# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint (React hooks + refresh rules)
```

Supabase Edge Functions (requires Supabase CLI):
```bash
supabase functions deploy ai                    # Deploy the AI edge function
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... # Set the API key server-side
```

No test framework is configured — there are no tests to run.

## Architecture

**Proxima** ("My Network") is a personal network intelligence PWA. Users track relationships via contacts + journal entries and visualize them on a Leaflet map.

### Frontend (React 19 + Vite 8)

- **Routing**: React Router v7 inside an auth gate. `App.jsx` renders `<Login>` when no session exists; authenticated routes live inside `<Shell>` which provides responsive nav (sidebar on md+, bottom tabs on mobile).
- **State**: Two Zustand stores — `store/auth.js` (session, signOut) and `hooks/useContacts.js` (contacts cache with fetch/remove). No Redux or Context providers. Component-local state via `useState` for everything else.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. Shared component classes (`.input`, `.btn`, `.btn-ghost`, `.card`) defined in `src/index.css` `@layer components`.
- **PWA**: `vite-plugin-pwa` with `registerType: 'autoUpdate'`. Manifest in `vite.config.js`.

### Backend (Supabase)

- **Auth**: Google OAuth + email magic link via `supabase.auth`. Google button calls `signInWithOAuth`; enabling it requires Google Cloud OAuth credentials configured in the Supabase dashboard (not a code change).
- **Database**: Postgres with PostGIS. Three tables: `contacts`, `journal_entries`, `journal_contact_links` (junction). All protected by RLS policies scoped to `auth.uid()`.
- **Schema migrations**: Applied in order: `supabase/schema.sql` → `02_step2.sql` (profile fields + avatars bucket) → `03_step3.sql` (lat/lng columns + PostGIS sync trigger). New migrations should follow the `NN_stepN.sql` naming pattern.
- **Edge Function** (`supabase/functions/ai/index.ts`): Deno runtime, proxies to Claude API. Three actions: `search` (natural-language contact matching), `brief` (pre-meeting summary), `parse` (free-text → contact IDs). Called from `src/lib/ai.js`.

### Key data flows

- **Contacts → Map**: `AddContact` geocodes the `city` field via OpenStreetMap Nominatim (`lib/geocode.js`) → stores lat/lng → `MapView` renders Leaflet `CircleMarker` for each contact with coordinates. Distance is Haversine (`lib/distance.js`), computed client-side.
- **Journal → Timeline**: Posting a journal entry with @mentions creates `journal_entries` row + `journal_contact_links` per tagged contact + updates `last_interaction` on each contact. `ContactProfile` queries links to build a per-person timeline.
- **Warmth**: Derived from `last_interaction` timestamp via `lib/warmth.js` — hot/warm/cold status, no AI involved.

### Environment

Two env vars required (see `.env.example`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable API key (safe for client; RLS protects data). Falls back to `VITE_SUPABASE_ANON_KEY` for older projects.

### Deployment

Vercel with SPA rewrite in `vercel.json`. Set the two env vars in Vercel dashboard.
