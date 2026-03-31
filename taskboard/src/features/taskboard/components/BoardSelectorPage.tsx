import { useState, type KeyboardEvent } from 'react'
import type { Workspace, WorkspaceInvite, WorkspaceRole } from '../types'

type BoardSelectorPageProps = {
  isLoading: boolean
  error: string | null
  notice: string | null
  userEmail: string | null
  personalBoards: Workspace[]
  groupBoards: Workspace[]
  pendingInvites: WorkspaceInvite[]
  manageableWorkspaceIds: string[]
  workspaceRoles: Record<string, WorkspaceRole>
  onOpenBoard: (workspaceId: string) => void
  onBackToLanding: () => void
  onCreateGroupBoard: (boardName: string) => Promise<boolean>
  onAcceptInvite: (inviteId: string) => Promise<boolean>
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
}

function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, onOpen: () => void) {
  if (event.target !== event.currentTarget) {
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

function PersonalBoardCard({
  board,
  onOpenBoard,
  onDeleteBoard,
}: {
  board: Workspace
  onOpenBoard: (workspaceId: string) => void
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    await onDeleteBoard(board.id)
    setIsDeleting(false)
  }

  return (
    <article
      className="board-card board-card-panel"
      role="button"
      tabIndex={0}
      onClick={() => onOpenBoard(board.id)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpenBoard(board.id))}
      aria-label={`Open personal board ${board.name}`}
    >
      <p className="board-card-type">Personal</p>
      <h3>{board.name}</h3>
      <p>Your private board</p>
      <div className="board-card-actions" onClick={(event) => event.stopPropagation()}>
        <button
          className="btn btn-danger"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
          aria-label="Delete board"
          title="Delete board"
        >
          {isDeleting ? '...' : '🗑️'}
        </button>
      </div>
    </article>
  )
}

function GroupBoardCard({
  board,
  canManage,
  role,
  onOpenBoard,
  onDeleteBoard,
}: {
  board: Workspace
  canManage: boolean
  role: WorkspaceRole | undefined
  onOpenBoard: (workspaceId: string) => void
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    await onDeleteBoard(board.id)
    setIsDeleting(false)
  }

  return (
    <article
      className="board-card board-card-panel"
      role="button"
      tabIndex={0}
      onClick={() => onOpenBoard(board.id)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpenBoard(board.id))}
      aria-label={`Open group board ${board.name}`}
    >
      <p className="board-card-type">Group</p>
      <h3>{board.name}</h3>
      <p>Your role: {role ?? 'member'}</p>

      <div className="board-card-actions" onClick={(event) => event.stopPropagation()}>
        {canManage && (
          <button
            className="btn btn-danger"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            aria-label="Delete board"
            title="Delete board"
          >
            {isDeleting ? '...' : '🗑️'}
          </button>
        )}
      </div>
    </article>
  )
}

export function BoardSelectorPage({
  isLoading,
  error,
  notice,
  userEmail,
  personalBoards,
  groupBoards,
  pendingInvites,
  manageableWorkspaceIds,
  workspaceRoles,
  onOpenBoard,
  onBackToLanding,
  onCreateGroupBoard,
  onAcceptInvite,
  onDeleteBoard,
}: BoardSelectorPageProps) {
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  async function handleCreateGroupBoard() {
    setIsCreatingGroup(true)
    const ok = await onCreateGroupBoard(newGroupName)
    if (ok) {
      setNewGroupName('')
    }
    setIsCreatingGroup(false)
  }

  return (
    <div className="board-selector-shell">
      <header className="board-selector-topbar">
        <div>
          <p className="eyebrow">Boards</p>
          <h1>Select a Board</h1>
          <p>Choose a personal or group board to continue into your workspace.</p>
        </div>
        <button className="btn btn-secondary" onClick={onBackToLanding}>
          Logout
        </button>
      </header>

      {error && <p className="error-banner">{error}</p>}
      {notice && <p className="notice-banner">{notice}</p>}

      <section className="board-list-section">
        <div className="board-list-header">
          <h2>Pending Invites</h2>
          <span>{pendingInvites.length}</span>
        </div>

        {!userEmail ? (
          <div className="board-list-empty">Pending invites require an account with an email address.</div>
        ) : pendingInvites.length === 0 ? (
          <div className="board-list-empty">No pending invites for {userEmail}.</div>
        ) : (
          <div className="board-list-grid">
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="board-card board-card-panel">
                <p className="board-card-type">Invite</p>
                <h3>{invite.workspace_name ?? 'Group Board'}</h3>
                <p>Role on join: {invite.role}</p>
                <div className="board-card-actions">
                  <button className="btn btn-primary" onClick={() => void onAcceptInvite(invite.id)}>
                    Accept Invite
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="board-list-section">
        <div className="board-list-header">
          <h2>Create Group Board</h2>
        </div>
        <div className="create-group-row">
          <input
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="Team Planning Board"
          />
          <button
            className="btn btn-primary"
            onClick={() => void handleCreateGroupBoard()}
            disabled={isCreatingGroup}
          >
            {isCreatingGroup ? 'Creating...' : 'Create Group Board'}
          </button>
        </div>
      </section>

      {isLoading ? (
        <section className="loading-state">
          <div className="spinner" />
          <p>Loading boards...</p>
        </section>
      ) : (
        <>
          <section className="board-list-section">
            <div className="board-list-header">
              <h2>Personal Boards</h2>
              <span>{personalBoards.length}</span>
            </div>

            {personalBoards.length === 0 ? (
              <div className="board-list-empty">No personal boards available yet.</div>
            ) : (
              <div className="board-list-grid">
                {personalBoards.map((board) => (
                  <PersonalBoardCard
                    key={board.id}
                    board={board}
                    onOpenBoard={onOpenBoard}
                    onDeleteBoard={onDeleteBoard}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="board-list-section">
            <div className="board-list-header">
              <h2>Group Boards</h2>
              <span>{groupBoards.length}</span>
            </div>

            {groupBoards.length === 0 ? (
              <div className="board-list-empty">No group boards yet.</div>
            ) : (
              <div className="board-list-grid">
                {groupBoards.map((board) => (
                  <GroupBoardCard
                    key={board.id}
                    board={board}
                    canManage={manageableWorkspaceIds.includes(board.id)}
                    role={workspaceRoles[board.id]}
                    onOpenBoard={onOpenBoard}
                    onDeleteBoard={onDeleteBoard}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
