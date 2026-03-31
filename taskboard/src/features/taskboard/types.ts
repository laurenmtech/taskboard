export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high'
export type BoardType = 'personal' | 'group'
export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type Workspace = {
  id: string
  name: string
  board_type: BoardType
  created_by: string
  created_at: string
}

export type WorkspaceMembership = {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
}

export type WorkspaceInvite = {
  id: string
  workspace_id: string
  invitee_email: string
  role: WorkspaceRole
  status: 'pending' | 'accepted' | 'revoked'
  invited_by: string
  created_at: string
  workspace_name?: string
}

export type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  user_id: string
  assignee_id: string | null
  created_at: string
}

export type Profile = {
  id: string
  display_name: string | null
  user_type: 'individual' | 'team_member' | 'team_admin'
  created_at: string
}

export type TaskFormState = {
  title: string
  description: string
  priority: TaskPriority
  due_date: string
}

export type ColumnDef = {
  id: TaskStatus
  title: string
  accent: 'slate' | 'blue' | 'amber' | 'green'
}
