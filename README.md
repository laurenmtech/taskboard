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


## Requirements

- Node.js 18+
- npm 9+
- A Supabase project


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

