import { arrayMove } from '@dnd-kit/sortable'
import { isBefore } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { COLUMNS, initialFormState } from '../constants'
import type {
  Task,
  TaskFormState,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceInvite,
  WorkspaceMembership,
  WorkspaceRole,
} from '../types'

function formatAuthError(message: string) {
  if (message.toLowerCase().includes('anonymous sign-ins are disabled')) {
    return 'Anonymous auth is disabled in Supabase. Enable it in Authentication > Providers > Anonymous, then refresh this page.'
  }
  return message
}

function formatDatabaseError(message: string) {
  const normalized = message.toLowerCase()
  if (
    normalized.includes('row-level security policy for table "workspace_memberships"') ||
    normalized.includes("row-level security policy for table 'workspace_memberships'")
  ) {
    return 'Workspace membership insert was blocked by RLS. Apply the latest policies from supabase/schema.sql, including the creator-owner bootstrap policy, then try again.'
  }
  if (
    normalized.includes('row-level security policy for table "tasks"') ||
    normalized.includes("row-level security policy for table 'tasks'")
  ) {
    return 'Task write was blocked by RLS. Apply the latest task policies from supabase/schema.sql so workspace creators and members can add tasks.'
  }
  if (normalized.includes('schema cache') || normalized.includes('could not find the table')) {
    return 'The tasks table is not available yet. Run supabase/schema.sql in your Supabase SQL Editor, then refresh the app.'
  }
  if (normalized.includes('violates foreign key constraint')) {
    return 'Referenced user or workspace was not found. Verify the UUID and try again.'
  }
  if (normalized.includes('duplicate key value')) {
    return 'This member is already part of that board.'
  }
  return message
}

function isDemoMemberId(memberId: string | null | undefined) {
  return !!memberId && memberId.startsWith('demo-')
}

type BootstrapOptions = {
  forceNewGuest?: boolean
  enterWorkspace?: boolean
}

export function useTaskboard() {
  type WorkspaceMember = { id: string; display_name: string | null }

  const [currentView, setCurrentView] = useState<'landing' | 'board-picker' | 'board'>('landing')
  const [tasks, setTasks] = useState<Task[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceRoles, setWorkspaceRoles] = useState<Record<string, WorkspaceRole>>({})
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvite[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [existingSessionUserId, setExistingSessionUserId] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [isSimulatingAuth, setIsSimulatingAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [formState, setFormState] = useState<TaskFormState>(initialFormState)
  const [viewMode, setViewMode] = useState<'board' | 'team'>('board')
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [simulatedMembersByWorkspace, setSimulatedMembersByWorkspace] = useState<
    Record<string, WorkspaceMember[]>
  >({})

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesText =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description ?? '').toLowerCase().includes(query)
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      return matchesText && matchesPriority
    })
  }, [tasks, search, priorityFilter])

  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === 'todo'),
      in_progress: filteredTasks.filter((task) => task.status === 'in_progress'),
      in_review: filteredTasks.filter((task) => task.status === 'in_review'),
      done: filteredTasks.filter((task) => task.status === 'done'),
    }
  }, [filteredTasks])

  const summary = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'done').length
    const overdue = tasks.filter(
      (task) =>
        !!task.due_date && isBefore(new Date(task.due_date), new Date()) && task.status !== 'done',
    ).length
    return { total, done, overdue }
  }, [tasks])

  const activeTask = useMemo(
    () => (activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null),
    [activeTaskId, tasks],
  )

  const personalWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.board_type === 'personal'),
    [workspaces],
  )

  const groupWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.board_type === 'group'),
    [workspaces],
  )

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const manageableWorkspaceIds = useMemo(
    () =>
      Object.entries(workspaceRoles)
        .filter(([, role]) => role === 'owner' || role === 'admin')
        .map(([workspaceId]) => workspaceId),
    [workspaceRoles],
  )

  useEffect(() => {
    void checkExistingSession()
  }, [])

  useEffect(() => {
    if (activeWorkspaceId && activeWorkspace?.board_type === 'group') {
      void fetchWorkspaceMembers(activeWorkspaceId)
    } else {
      setWorkspaceMembers([])
    }
  }, [activeWorkspaceId, activeWorkspace?.board_type])

  async function checkExistingSession() {
    setIsCheckingSession(true)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setError(`Unable to check session: ${sessionError.message}`)
      setIsCheckingSession(false)
      return
    }

    const sessionUserId = sessionData.session?.user.id ?? null
    setExistingSessionUserId(sessionUserId)
    setUserId(sessionUserId)
    setIsCheckingSession(false)
  }

  async function ensureUserSession(options?: { forceNewGuest?: boolean }) {
    const forceNewGuest = options?.forceNewGuest ?? false

    if (forceNewGuest) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) {
        setError(`Could not reset session: ${signOutError.message}`)
        return null
      }
      setExistingSessionUserId(null)
      setUserId(null)
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setError(`Unable to start session: ${sessionError.message}`)
      return null
    }

    let activeUserId = sessionData.session?.user.id ?? null
    if (!activeUserId) {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError) {
        setError(formatAuthError(anonError.message))
        return null
      }
      activeUserId = anonData.user?.id ?? null
    }

    if (!activeUserId) {
      setError('No authenticated user found for this session.')
      return null
    }

    setUserId(activeUserId)
    setExistingSessionUserId(activeUserId)
    setUserEmail(sessionData.session?.user.email ?? null)
    return activeUserId
  }

  async function fetchTasks() {
    if (!activeWorkspaceId) {
      setTasks([])
      return
    }

    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(`Could not load tasks: ${formatDatabaseError(fetchError.message)}`)
      return
    }

    setTasks((data ?? []) as Task[])
  }

  async function fetchWorkspaces(activeUserId: string) {
    const { data, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id,name,board_type,created_by,created_at')
      .order('created_at', { ascending: true })

    if (workspaceError) {
      setError(`Could not load boards: ${formatDatabaseError(workspaceError.message)}`)
      return []
    }

    const loadedWorkspaces = (data ?? []) as Workspace[]
    setWorkspaces(loadedWorkspaces)

    if (!activeWorkspaceId && loadedWorkspaces.length > 0) {
      const personal = loadedWorkspaces.find(
        (workspace) => workspace.board_type === 'personal' && workspace.created_by === activeUserId,
      )
      setActiveWorkspaceId(personal?.id ?? loadedWorkspaces[0].id)
    }

    return loadedWorkspaces
  }

  async function fetchWorkspaceRoles(activeUserId: string, sourceWorkspaces?: Workspace[]) {
    const { data, error: membershipError } = await supabase
      .from('workspace_memberships')
      .select('workspace_id,user_id,role')
      .eq('user_id', activeUserId)

    if (membershipError) {
      setError(`Could not load memberships: ${formatDatabaseError(membershipError.message)}`)
      return
    }

    const entries = (data ?? []) as WorkspaceMembership[]
    const roleMap: Record<string, WorkspaceRole> = {}
    for (const entry of entries) {
      roleMap[entry.workspace_id] = entry.role
    }

    // Fallback for legacy setups where owner membership was not inserted.
    const workspacesToCheck = sourceWorkspaces ?? workspaces
    for (const workspace of workspacesToCheck) {
      if (workspace.created_by === activeUserId && !roleMap[workspace.id]) {
        roleMap[workspace.id] = 'owner'
      }
    }

    setWorkspaceRoles(roleMap)
  }

  async function fetchWorkspaceMembers(workspaceId: string) {
    const { data, error: memberError } = await supabase
      .from('workspace_memberships')
      .select('user_id,workspaces(created_by)')
      .eq('workspace_id', workspaceId)

    if (memberError) {
      // Non-fatal error, continue without members list
      const simulatedMembers = simulatedMembersByWorkspace[workspaceId] ?? []
      setWorkspaceMembers(simulatedMembers)
      return
    }

    const memberIds = (data ?? []).map((m: any) => m.user_id)
    
    const simulatedMembers = simulatedMembersByWorkspace[workspaceId] ?? []

    if (memberIds.length === 0) {
      setWorkspaceMembers(simulatedMembers)
      return
    }

    // Fetch profiles for all members
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,display_name')
      .in('id', memberIds)

    if (profileError) {
      setWorkspaceMembers(simulatedMembers)
      return
    }

    const members = (profiles ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
    })) as WorkspaceMember[]

    const mergedMembers = [...members]
    for (const demoMember of simulatedMembers) {
      if (!mergedMembers.some((member) => member.id === demoMember.id)) {
        mergedMembers.push(demoMember)
      }
    }

    setWorkspaceMembers(mergedMembers)
  }

  function simulateTeamMembers() {
    if (!activeWorkspaceId || activeWorkspace?.board_type !== 'group') {
      setError('Demo members can only be added inside a group board.')
      return
    }

    const namePool = [
      'Alex Rivera',
      'Jordan Kim',
      'Taylor Morgan',
      'Sam Patel',
      'Casey Nguyen',
      'Riley Chen',
      'Avery Brooks',
      'Drew Flores',
    ]

    const existingNames = new Set(
      (workspaceMembers ?? []).map((member) => (member.display_name ?? '').toLowerCase()),
    )

    const selectedNames = namePool.filter((name) => !existingNames.has(name.toLowerCase())).slice(0, 3)

    if (selectedNames.length === 0) {
      setNotice('All demo members from the sample set are already added for this board.')
      return
    }

    const timestamp = Date.now()
    const demoMembers: WorkspaceMember[] = selectedNames.map((name, index) => ({
      id: `demo-${activeWorkspaceId}-${timestamp}-${index}`,
      display_name: name,
    }))

    setSimulatedMembersByWorkspace((current) => {
      const existing = current[activeWorkspaceId] ?? []
      return {
        ...current,
        [activeWorkspaceId]: [...existing, ...demoMembers],
      }
    })

    setWorkspaceMembers((current) => [...current, ...demoMembers])
    setViewMode('team')
    setError(null)
    setNotice(`Added ${demoMembers.length} demo team member${demoMembers.length > 1 ? 's' : ''}.`)
  }

  async function createInitialPersonalWorkspace(activeUserId: string) {
    const { data: createdWorkspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: 'My Personal Board',
        board_type: 'personal',
        created_by: activeUserId,
      })
      .select('id,name,board_type,created_by,created_at')
      .single()

    if (workspaceError) {
      setError(`Could not create initial board: ${formatDatabaseError(workspaceError.message)}`)
      return null
    }

    // Try owner membership setup if policy allows it; continue even if it fails.
    const { error: membershipError } = await supabase.from('workspace_memberships').upsert(
      {
        workspace_id: createdWorkspace.id,
        user_id: activeUserId,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' },
    )

    if (membershipError) {
      setNotice('Board created. Owner membership will be inferred from board creator for now.')
    }

    return createdWorkspace as Workspace
  }

  async function fetchPendingInvites() {
    const email = userEmail?.toLowerCase() ?? ''
    if (!email) {
      setPendingInvites([])
      return
    }

    const { data, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('id,workspace_id,invitee_email,role,status,invited_by,created_at,workspaces(name)')
      .eq('status', 'pending')
      .eq('invitee_email', email)
      .order('created_at', { ascending: false })

    if (inviteError) {
      setError(`Could not load invites: ${formatDatabaseError(inviteError.message)}`)
      return
    }

    const invites = (data ?? []).map((item: any) => ({
      id: item.id,
      workspace_id: item.workspace_id,
      invitee_email: item.invitee_email,
      role: item.role,
      status: item.status,
      invited_by: item.invited_by,
      created_at: item.created_at,
      workspace_name: item.workspaces?.name ?? 'Group Board',
    })) as WorkspaceInvite[]

    setPendingInvites(invites)
  }

  async function bootstrapSession(options?: BootstrapOptions) {
    const forceNewGuest = options?.forceNewGuest ?? false
    const enterWorkspace = options?.enterWorkspace ?? false

    setIsLoading(true)
    setError(null)

    const activeUserId = await ensureUserSession({ forceNewGuest })
    if (!activeUserId) {
      setIsLoading(false)
      return
    }

    let loadedWorkspaces = await fetchWorkspaces(activeUserId)

    if (loadedWorkspaces.length === 0) {
      const createdWorkspace = await createInitialPersonalWorkspace(activeUserId)
      if (createdWorkspace) {
        loadedWorkspaces = await fetchWorkspaces(activeUserId)

        // If replication/cache lag delays immediate read visibility, continue with created board.
        if (loadedWorkspaces.length === 0) {
          loadedWorkspaces = [createdWorkspace]
          setWorkspaces([createdWorkspace])
          setNotice('Created your personal board. It may take a moment to appear in all views.')
        }
      }
    }

    await fetchWorkspaceRoles(activeUserId, loadedWorkspaces)
    await fetchPendingInvites()

    if (loadedWorkspaces.length === 0) {
      setError((current) => current ?? 'No boards found for this user yet. Refresh in a moment to let setup complete.')
      setIsLoading(false)
      return
    }

    const initialWorkspaceId =
      activeWorkspaceId ??
      loadedWorkspaces.find(
        (workspace) => workspace.board_type === 'personal' && workspace.created_by === activeUserId,
      )?.id ??
      loadedWorkspaces[0].id

    setActiveWorkspaceId(initialWorkspaceId)
    setTasks([])
    setIsLoading(false)

    if (enterWorkspace) {
      setCurrentView('board-picker')
    }
  }

  async function openWorkspace(workspaceId: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return
    }

    setIsLoading(true)
    setError(null)

    // Fetch workspace data BEFORE setting active workspace ID
    await fetchWorkspaces(activeUserId)
    await fetchWorkspaceRoles(activeUserId)

    // Now set the active workspace ID so it can be found in the workspaces array
    setActiveWorkspaceId(workspaceId)

    // Then fetch tasks for this workspace
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(`Could not load tasks: ${formatDatabaseError(fetchError.message)}`)
      setIsLoading(false)
      return
    }

    setTasks((data ?? []) as Task[])
    setCurrentView('board')
    setIsLoading(false)
  }

  async function refreshCurrentWorkspace() {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId || !activeWorkspaceId) {
      return
    }

    setIsLoading(true)
    await fetchWorkspaces(activeUserId)
    await fetchWorkspaceRoles(activeUserId)
    await fetchPendingInvites()
    await fetchTasks()
    setIsLoading(false)
  }

  async function createGroupBoard(boardName: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    const trimmed = boardName.trim()
    if (!trimmed) {
      setError('Group board name is required.')
      return false
    }

    setIsLoading(true)
    setError(null)

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: trimmed,
        board_type: 'group',
        created_by: activeUserId,
      })
      .select('id,name,board_type,created_by,created_at')
      .single()

    if (workspaceError) {
      setError(`Could not create board: ${formatDatabaseError(workspaceError.message)}`)
      setIsLoading(false)
      return false
    }

    const { error: membershipError } = await supabase.from('workspace_memberships').upsert(
      {
        workspace_id: workspace.id,
        user_id: activeUserId,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' },
    )

    if (membershipError) {
      setError(`Board created, but membership setup failed: ${formatDatabaseError(membershipError.message)}`)
      setIsLoading(false)
      return false
    }

    await fetchWorkspaces(activeUserId)
    await fetchWorkspaceRoles(activeUserId)
    setIsLoading(false)
    return true
  }

  async function createPersonalBoard(boardName: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    const trimmed = boardName.trim()
    if (!trimmed) {
      setError('Personal board name is required.')
      return false
    }

    setIsLoading(true)
    setError(null)

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: trimmed,
        board_type: 'personal',
        created_by: activeUserId,
      })
      .select('id,name,board_type,created_by,created_at')
      .single()

    if (workspaceError) {
      setError(`Could not create board: ${formatDatabaseError(workspaceError.message)}`)
      setIsLoading(false)
      return false
    }

    const { error: membershipError } = await supabase.from('workspace_memberships').upsert(
      {
        workspace_id: workspace.id,
        user_id: activeUserId,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' },
    )

    if (membershipError) {
      setError(`Board created, but membership setup failed: ${formatDatabaseError(membershipError.message)}`)
      setIsLoading(false)
      return false
    }

    await fetchWorkspaces(activeUserId)
    await fetchWorkspaceRoles(activeUserId)
    setIsLoading(false)
    return true
  }

  async function inviteMemberToBoard(workspaceId: string, inviteeEmail: string, role: WorkspaceRole) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    const normalizedEmail = inviteeEmail.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('A valid member email is required.')
      return false
    }

    if (!manageableWorkspaceIds.includes(workspaceId)) {
      setError('Only board owners or admins can invite members.')
      return false
    }

    setError(null)
    setNotice(null)

    const { error: inviteError } = await supabase.from('workspace_invites').upsert(
      {
        workspace_id: workspaceId,
        invitee_email: normalizedEmail,
        role,
        status: 'pending',
        invited_by: activeUserId,
      },
      { onConflict: 'workspace_id,invitee_email' },
    )

    if (inviteError) {
      setError(`Could not invite member: ${formatDatabaseError(inviteError.message)}`)
      return false
    }

    setNotice(`Invite sent to ${normalizedEmail}.`)
    return true
  }

  async function acceptInvite(inviteId: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    const invite = pendingInvites.find((item) => item.id === inviteId)
    if (!invite) {
      setError('Invite not found.')
      return false
    }

    setError(null)
    setNotice(null)

    const { error: membershipError } = await supabase.from('workspace_memberships').upsert(
      {
        workspace_id: invite.workspace_id,
        user_id: activeUserId,
        role: invite.role,
      },
      { onConflict: 'workspace_id,user_id' },
    )

    if (membershipError) {
      setError(`Could not accept invite: ${formatDatabaseError(membershipError.message)}`)
      return false
    }

    const { error: inviteUpdateError } = await supabase
      .from('workspace_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)

    if (inviteUpdateError) {
      setError(`Joined board, but invite update failed: ${formatDatabaseError(inviteUpdateError.message)}`)
      return false
    }

    await refreshCurrentWorkspace()
    setNotice(`Joined ${invite.workspace_name ?? 'group board'}.`)
    return true
  }

  async function deleteBoard(workspaceId: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (!workspace) {
      setError('Board not found.')
      return false
    }

    // Only allow deletion by creators or admins
    if (workspace.created_by !== activeUserId && !manageableWorkspaceIds.includes(workspaceId)) {
      setError('Only board owners or admins can delete boards.')
      return false
    }

    const confirmed = window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)
    if (!confirmed) {
      return false
    }

    setError(null)
    setNotice(null)

    const { error: deleteError } = await supabase.from('workspaces').delete().eq('id', workspaceId)

    if (deleteError) {
      setError(`Could not delete board: ${formatDatabaseError(deleteError.message)}`)
      return false
    }

    await fetchWorkspaces(activeUserId)
    await fetchWorkspaceRoles(activeUserId)
    setNotice(`Board "${workspace.name}" deleted.`)
    return true
  }

  function goToBoardPicker() {
    setCurrentView('board-picker')
    setIsCreatingTask(false)
  }

  function goToLanding() {
    setCurrentView('landing')
    setIsCreatingTask(false)
    setTasks([])
    setActiveWorkspaceId(null)
    setNotice(null)
  }

  async function createTask() {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId) {
      return false
    }

    if (!activeWorkspaceId) {
      setError('Select a board before creating tasks.')
      return false
    }

    if (!formState.title.trim()) {
      setError('Task title is required.')
      return false
    }

    setIsSavingTask(true)
    setError(null)

    if (editingTaskId) {
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update({
          title: formState.title.trim(),
          description: formState.description.trim() || null,
          priority: formState.priority,
          due_date: formState.due_date || null,
        })
        .eq('id', editingTaskId)
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', activeUserId)
        .select('*')
        .single()

      if (updateError) {
        setError(`Could not update task: ${formatDatabaseError(updateError.message)}`)
        setIsSavingTask(false)
        return false
      }

      setTasks((current) =>
        current.map((task) => (task.id === editingTaskId ? ({ ...task, ...(data as Task) } as Task) : task)),
      )
    } else {
      const { data, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: formState.title.trim(),
          description: formState.description.trim() || null,
          status: 'todo',
          priority: formState.priority,
          due_date: formState.due_date || null,
          workspace_id: activeWorkspaceId,
          user_id: activeUserId,
        })
        .select('*')
        .single()

      if (createError) {
        setError(`Could not create task: ${formatDatabaseError(createError.message)}`)
        setIsSavingTask(false)
        return false
      }

      setTasks((current) => [data as Task, ...current])
    }

    setFormState(initialFormState)
    setEditingTaskId(null)
    setIsCreatingTask(false)
    setIsSavingTask(false)
    return true
  }

  function openCreateTaskModal() {
    setEditingTaskId(null)
    setFormState(initialFormState)
    setError(null)
    setIsCreatingTask(true)
  }

  function openEditTaskModal(task: Task) {
    setEditingTaskId(task.id)
    setFormState({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      due_date: task.due_date ?? '',
    })
    setError(null)
    setIsCreatingTask(true)
  }

  function closeTaskModal() {
    setIsCreatingTask(false)
    setEditingTaskId(null)
    setFormState(initialFormState)
  }

  async function deleteTask(taskId: string) {
    const activeUserId = userId ?? (await ensureUserSession())
    if (!activeUserId || !activeWorkspaceId) {
      return false
    }

    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      setError('Task not found.')
      return false
    }

    const confirmed = window.confirm(`Delete "${task.title}"? This cannot be undone.`)
    if (!confirmed) {
      return false
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', activeUserId)

    if (deleteError) {
      setError(`Could not delete task: ${formatDatabaseError(deleteError.message)}`)
      return false
    }

    setTasks((current) => current.filter((item) => item.id !== taskId))
    if (editingTaskId === taskId) {
      closeTaskModal()
    }
    return true
  }

  async function simulateNewGuestSignIn() {
    setIsSimulatingAuth(true)
    setIsCreatingTask(false)
    await bootstrapSession({ forceNewGuest: true, enterWorkspace: true })
    setIsSimulatingAuth(false)
  }

  function updateFormState<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  function getStatusFromDropTarget(overId: string): TaskStatus | null {
    const directColumn = COLUMNS.find((column) => column.id === overId)
    if (directColumn) {
      return directColumn.id
    }

    const targetTask = tasks.find((task) => task.id === overId)
    return targetTask?.status ?? null
  }

  function getAssigneeFromDropTarget(overId: string): string | null | undefined {
    if (overId === 'team-unassigned') {
      return null
    }

    if (overId.startsWith('team-member-')) {
      return overId.replace('team-member-', '')
    }

    const targetTask = tasks.find((task) => task.id === overId)
    if (targetTask) {
      return targetTask.assignee_id
    }

    return undefined
  }

  function handleDragStart(taskId: string) {
    setActiveTaskId(taskId)
  }

  async function handleDragEnd(activeId: string, overId: string | null) {
    setActiveTaskId(null)
    if (!overId || !userId || activeId === overId) {
      return
    }

    const activeTask = tasks.find((task) => task.id === activeId)
    if (!activeTask) {
      return
    }

    const targetStatus = getStatusFromDropTarget(overId)
    if (!targetStatus) {
      return
    }

    const activeIndex = tasks.findIndex((task) => task.id === activeId)
    const overIndex = tasks.findIndex((task) => task.id === overId)
    let nextTasks = tasks

    if (overIndex >= 0 && activeTask.status === tasks[overIndex].status) {
      nextTasks = arrayMove(tasks, activeIndex, overIndex)
      setTasks(nextTasks)
    }

    if (activeTask.status === targetStatus) {
      return
    }

    const previousTasks = nextTasks
    const optimisticTasks = nextTasks.map((task) =>
      task.id === activeId ? { ...task, status: targetStatus } : task,
    )
    setTasks(optimisticTasks)

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: targetStatus })
      .eq('id', activeId)
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', userId)

    if (updateError) {
      setTasks(previousTasks)
      setError(`Could not move task: ${formatDatabaseError(updateError.message)}`)
    }
  }

  async function handleTeamDragEnd(activeId: string, overId: string | null) {
    setActiveTaskId(null)
    if (!overId || !activeWorkspaceId || activeId === overId) {
      return
    }

    const draggedTask = tasks.find((task) => task.id === activeId)
    if (!draggedTask) {
      return
    }

    const targetAssigneeId = getAssigneeFromDropTarget(overId)
    if (targetAssigneeId === undefined) {
      return
    }

    if ((draggedTask.assignee_id ?? null) === targetAssigneeId) {
      return
    }

    const previousTasks = tasks
    const optimisticTasks = tasks.map((task) =>
      task.id === activeId ? { ...task, assignee_id: targetAssigneeId } : task,
    )
    setTasks(optimisticTasks)

    // Demo members exist only in local UI state, so we keep this assignment client-side.
    if (isDemoMemberId(targetAssigneeId)) {
      setNotice('Assigned task to demo member (local demo only).')
      return
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assignee_id: targetAssigneeId })
      .eq('id', activeId)
      .eq('workspace_id', activeWorkspaceId)

    if (updateError) {
      setTasks(previousTasks)
      setError(`Could not assign task: ${formatDatabaseError(updateError.message)}`)
    }
  }

  return {
    currentView,
    isCheckingSession,
    existingSessionUserId,
    isLoading,
    userId,
    userEmail,
    workspaces,
    personalWorkspaces,
    groupWorkspaces,
    activeWorkspace,
    workspaceRoles,
    manageableWorkspaceIds,
    pendingInvites,
    tasksByStatus,
    tasks,
    summary,
    search,
    priorityFilter,
    viewMode,
    workspaceMembers,
    error,
    notice,
    activeTask,
    filteredTasks,
    isCreatingTask,
    editingTaskId,
    isSavingTask,
    isSimulatingAuth,
    formState,
    setSearch,
    setPriorityFilter,
    setViewMode,
    setIsCreatingTask,
    updateFormState,
    openCreateTaskModal,
    openEditTaskModal,
    closeTaskModal,
    bootstrapSession,
    openWorkspace,
    refreshCurrentWorkspace,
    createGroupBoard,
    createPersonalBoard,
    inviteMemberToBoard,
    acceptInvite,
    deleteBoard,
    goToBoardPicker,
    goToLanding,
    createTask,
    deleteTask,
    simulateTeamMembers,
    simulateNewGuestSignIn,
    handleDragStart,
    handleDragEnd,
    handleTeamDragEnd,
  }
}
