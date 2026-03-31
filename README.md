# Taskboard

A modern Kanban app built with React, TypeScript, Vite, and Supabase.

Taskboard supports personal boards, collaborative group boards, team-oriented task views, and drag-and-drop workflows for both status and assignee management.

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

## Project Structure

Key paths:

- src/features/taskboard/hooks/useTaskboard.ts: Central state and data operations
- src/features/taskboard/components/: UI screens/components
- src/features/taskboard/styles/: Feature styles
- supabase/schema.sql: Database schema, constraints, indexes, and RLS policies

## Requirements

- Node.js 18+
- npm 9+
- A Supabase project

## Environment Variables

Create a local env file from .env.example:

```bash
cp .env.example .env.local
```

Set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Important:

- Use the publishable anon key only
- Do not expose the service role key in frontend code

## Supabase Setup

1. Enable anonymous auth in Supabase:
	Authentication -> Providers -> Anonymous -> Enable
2. Open SQL Editor and run all SQL in supabase/schema.sql
3. Confirm tables exist:
	- profiles
	- workspaces
	- workspace_memberships
	- workspace_invites
	- tasks

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

Notes on demo members:

- Demo members are local UI-only entities
- Assigning a task to a demo member is local-only and not persisted to DB
- Assigning to real members is persisted

## Screenshots and Demo Media

Add project images/GIFs under an assets folder in the repo, for example:

- docs/images/board-selector.png
- docs/images/board-view.png
- docs/images/team-view.png
- docs/images/team-drag-drop.gif

Then replace placeholders below with your real files.

### Board Selector

![Board Selector](docs/images/board-selector.png)

### Board View

![Board View](docs/images/board-view.png)

### Team View

![Team View](docs/images/team-view.png)

### Drag and Drop Assignment Demo

![Team Drag and Drop Demo](docs/images/team-drag-drop.gif)

Optional: if your GIFs are large, compress them with ffmpeg before committing.

```bash
ffmpeg -i input.mp4 -vf "fps=12,scale=1280:-1:flags=lanczos" -loop 0 docs/images/team-drag-drop.gif
```

## Data and Access Model

High-level behavior:

- Workspaces are personal or group
- Memberships control access and roles (owner/admin/member)
- Invites are email-based and can be accepted from Pending Invites
- Tasks belong to a workspace and can optionally have assignee_id

RLS in schema.sql protects reads/writes based on ownership and membership checks.

## Deployment

Any static host that supports Vite output works.

For Vercel / Netlify / Cloudflare Pages:

- Build command: npm run build
- Output directory: dist
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

## Troubleshooting

Anonymous auth error:

- Enable anonymous provider in Supabase Auth settings

Tasks table/schema cache errors:

- Re-run supabase/schema.sql in Supabase SQL Editor

RLS insert/update blocked:

- Ensure the latest policies from supabase/schema.sql are applied

Team assignment to demo member not persisting:

- Expected behavior; demo members are intentionally local-only

## License

Add your preferred license (MIT, Apache-2.0, etc.) if distributing this project publicly.
