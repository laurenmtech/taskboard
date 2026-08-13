# Momentum

A modern Kanban app built with React, TypeScript, Vite, and Supabase.

Momentum supports personal boards, collaborative group boards, team-oriented task views, and drag-and-drop workflows for both status and assignee management.

Check out the demo here: https://taskboard-blue.vercel.app

## Features

- Personal and group boards
- Board selector page with clickable board cards
- Workspace deletion support (owner/admin)
- Guest-friendly onboarding via Supabase anonymous auth
- Invite acceptance flow (Pending Invites section)
- Four status columns: To Do, In Progress, In Review, Done
- Drag and drop across status columns
- Team View grouped by assignee
- Drag and drop assignment in Team View (Unassigned -> team member)
- Demo team members for presentation/testing flows
- Search and priority filtering
- Task creation with title, description, priority, due date
- Summary metrics (total, completed, overdue)
- Responsive UI, loading states, and error banners

## Tech Stack

- React 18
- TypeScript
- Vite 5
- Supabase (Auth + Postgres + RLS)
- dnd-kit
- date-fns
- clsx


## Requirements

- Node.js 18+
- npm 9+
- A Supabase project


## Supabase Setup

1. Enable anonymous auth:
	Authentication -> Providers -> Anonymous -> Enable
2. Enable Google sign-in:
	- In Google Cloud Console, create an OAuth 2.0 Client ID (Web application)
	- Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
	- Paste the Client ID and Secret into Authentication -> Providers -> Google
3. Enable manual linking, so guests can upgrade to a Google account
	without losing their boards:
	Authentication -> Providers -> Allow manual linking
4. Set redirect URLs under Authentication -> URL Configuration:
	- Site URL: your production URL
	- Additional redirect URLs: `http://localhost:5173/**`
5. Open SQL Editor and run all SQL in supabase/schema.sql
6. Confirm tables exist:
	- profiles
	- workspaces
	- workspace_memberships
	- workspace_invites
	- tasks

## Auth Model

- Guests get an anonymous Supabase user and a personal board immediately.
- Signing in with Google links a Google identity onto that same anonymous user,
  so the user id is preserved and all existing boards and tasks carry over.
- Workspace invites are matched on the JWT email claim, so they only resolve
  for Google-authenticated users, not guests.

## Run Locally

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## Demo Flow (Recommended)

1. Start app and continue as guest
2. Create or open a group board
3. Use Add Demo Members in workspace header
4. Switch to Team View
5. Drag tasks from Unassigned to member columns

