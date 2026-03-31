# Momentum Board

A polished Kanban board inspired by Asana/Linear-style workflows.

## Features

- Guest account support via Supabase anonymous auth
- Four-column board: To Do, In Progress, In Review, Done
- Drag and drop task movement across columns
- Task creation with title, description, priority, and due date
- Search and priority filters
- Summary stats (total, completed, overdue)
- Responsive layout for desktop and mobile
- Loading, empty, and error states

## Tech Stack

- React + TypeScript + Vite
- Supabase (Auth + Postgres)
- dnd-kit for drag and drop
- date-fns + clsx

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_SUPABASE_ANON_KEY
```

3. In Supabase Dashboard, enable anonymous sign-in:

- Auth -> Providers -> Anonymous -> Enable

4. Run SQL schema and policies from `supabase/schema.sql`.

5. Start the app:

```bash
npm run dev
```

## Supabase Schema and RLS

- Full SQL schema is in `supabase/schema.sql`
- RLS is enabled on `public.tasks`
- Policies ensure users can only read/write rows where `user_id = auth.uid()`

## Build

```bash
npm run build
```

## Deploy

### Vercel

1. Push this repo to GitHub.
2. Import project into Vercel.
3. Set environment variables from `.env.example`.
4. Deploy.

### Netlify / Cloudflare Pages

- Build command: `npm run build`
- Publish directory: `dist`
- Add the same environment variables in project settings

## Security Notes

- Use only the publishable anon key in frontend env vars.
- Never commit your Supabase service role key.
