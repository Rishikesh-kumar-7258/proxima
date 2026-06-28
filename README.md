# Proxima

Proxima is a personal network intelligence app that helps you keep track of the people in your life. It combines a contact manager, a relationship journal, and an interactive map into a single installable PWA so you can see who you know, where they are, and when you last connected.

## Features

### Contacts
- Store contacts with multiple addresses, tags, and profile photos
- Address autocomplete powered by OpenStreetMap Nominatim
- Track relationship warmth (hot / warm / cold) based on your last interaction
- View a full profile page with timeline of all journal entries for each person

### Journal
- Write timestamped journal entries about your interactions
- @mention contacts to link entries to people and automatically update their last-interaction date
- Markdown formatting support with live preview
- Draft persistence so you never lose an in-progress entry
- Filter entries by person or date range

### Map
- Interactive Leaflet map with avatar or initials markers for every contact that has coordinates
- Set a custom "viewing from" origin and see contacts sorted by distance
- Radius-filtered distance list alongside the map
- Place-type filters, multiple map themes, and fullscreen mode
- Click-to-place marker for quickly setting a location
- Search overlay to find and pin locations
- Responsive layout for both desktop and mobile

### AI (optional)
- Natural-language contact search, pre-meeting briefings, and free-text parsing via a Supabase Edge Function that proxies to Claude
- Requires deploying the `supabase/functions/ai` edge function and setting an `ANTHROPIC_API_KEY` secret

### General
- Installable PWA with offline support and auto-update
- Google OAuth and email magic-link authentication
- Row-Level Security on all data — each user only sees their own contacts, entries, and links

## Setup

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url>
cd proxima
npm install
```

### 2. Configure Supabase

1. Create a Supabase project (or use an existing one).
2. Open the SQL Editor and run the migration scripts **in order**:
   - [supabase/schema.sql](supabase/schema.sql)
   - [supabase/02_step2.sql](supabase/02_step2.sql) — profile columns + `avatars` storage bucket
   - [supabase/03_step3.sql](supabase/03_step3.sql) — lat/lng columns + PostGIS location-sync trigger
   - [supabase/04_step4.sql](supabase/04_step4.sql)
3. Under **Authentication > Providers**, enable **Email**.

### 3. Set environment variables

```bash
cp .env.example .env
```

Fill in your project URL and publishable key from **Supabase > Settings > API Keys**:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Older projects that still have a legacy anon key can use `VITE_SUPABASE_ANON_KEY` instead.

### 4. Run

```bash
npm run dev
```

The app starts at [http://localhost:5173](http://localhost:5173).

### Enable "Continue with Google" (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials > **Create OAuth client ID** > Web application.
   - Set the **Authorized redirect URI** to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - Copy the **Client ID** and **Client Secret**.
2. In Supabase, go to **Authentication > Providers > Google**, paste the credentials, enable, and save.
3. Under **Authentication > URL Configuration**, set the **Site URL** to your app origin (`http://localhost:5173` for dev) and add it to **Redirect URLs**.

### Deploy the AI edge function (optional)

```bash
supabase functions deploy ai
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Deployment

Import the repo on [Vercel](https://vercel.com/new), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables, and deploy. The included [vercel.json](vercel.json) handles SPA routing. On Android, the PWA can be installed via Chrome's "Add to Home Screen".

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19, Vite 8 |
| Styling | Tailwind CSS v4 (Vite plugin) |
| State | Zustand |
| Routing | React Router v7 |
| Maps | Leaflet + react-leaflet |
| Backend | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions) |
| PWA | vite-plugin-pwa |

## Scripts

```bash
npm run dev       # Start the Vite dev server
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # Run ESLint
```
