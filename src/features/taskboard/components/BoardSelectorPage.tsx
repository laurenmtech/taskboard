import { useState, type KeyboardEvent } from 'react'
import type { Workspace, WorkspaceInvite, WorkspaceRole } from '../types'
import { AccountBar } from './AccountBar'

type BoardSelectorPageProps = {
  isLoading: boolean
  error: string | null
  notice: string | null
  userEmail: string | null
  displayName: string | null
  isAnonymous: boolean
  isAuthenticating: boolean
  onUpgradeWithGoogle: () => void
  onSignOut: () => void
  personalBoards: Workspace[]
  groupBoards: Workspace[]
  pendingInvites: WorkspaceInvite[]
  manageableWorkspaceIds: string[]
  workspaceRoles: Record<string, WorkspaceRole>
  onOpenBoard: (workspaceId: string) => void
  onCreateGroupBoard: (boardName: string) => Promise<boolean>
  onCreatePersonalBoard: (boardName: string) => Promise<boolean>
  onAcceptInvite: (inviteId: string) => Promise<boolean>
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
  onRenameBoard: (workspaceId: string, name: string) => Promise<boolean>
}

function BoardCardTitle({
  board,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onRenameBoard,
}: {
  board: Workspace
  isEditing: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onRenameBoard: (workspaceId: string, name: string) => Promise<boolean>
}) {
  const [draftName, setDraftName] = useState(board.name)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    const ok = await onRenameBoard(board.id, draftName)
    setIsSaving(false)
    if (ok) {
      onCancelEditing()
    }
  }

  if (!isEditing) {
    return (
      <h3 className="board-card-title">
        {board.name}
        <button
          className="board-card-rename"
          onClick={(event) => {
            event.stopPropagation()
            setDraftName(board.name)
            onStartEditing()
          }}
          aria-label={`Rename ${board.name}`}
          title="Rename board"
        >
          ✏️
        </button>
      </h3>
    )
  }

  return (
    <div className="board-card-rename-row" onClick={(event) => event.stopPropagation()}>
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onKeyDown={(event) => {
          // The card is itself a button; stop Enter and Space from reopening the board.
          event.stopPropagation()
          if (event.key === 'Enter') {
            void handleSave()
          } else if (event.key === 'Escape') {
            onCancelEditing()
          }
        }}
        aria-label="Board name"
        disabled={isSaving}
        autoFocus
      />
      <button className="btn btn-primary btn-compact" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? '...' : 'Save'}
      </button>
      <button className="btn btn-ghost btn-compact" onClick={onCancelEditing} disabled={isSaving}>
        Cancel
      </button>
    </div>
  )
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
  onRenameBoard,
}: {
  board: Workspace
  onOpenBoard: (workspaceId: string) => void
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
  onRenameBoard: (workspaceId: string, name: string) => Promise<boolean>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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
      onClick={() => !isEditing && onOpenBoard(board.id)}
      onKeyDown={(event) => !isEditing && handleCardKeyDown(event, () => onOpenBoard(board.id))}
      aria-label={`Open personal board ${board.name}`}
    >
      <p className="board-card-type">Personal</p>
      <BoardCardTitle
        board={board}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onCancelEditing={() => setIsEditing(false)}
        onRenameBoard={onRenameBoard}
      />
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
  onRenameBoard,
}: {
  board: Workspace
  canManage: boolean
  role: WorkspaceRole | undefined
  onOpenBoard: (workspaceId: string) => void
  onDeleteBoard: (workspaceId: string) => Promise<boolean>
  onRenameBoard: (workspaceId: string, name: string) => Promise<boolean>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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
      onClick={() => !isEditing && onOpenBoard(board.id)}
      onKeyDown={(event) => !isEditing && handleCardKeyDown(event, () => onOpenBoard(board.id))}
      aria-label={`Open group board ${board.name}`}
    >
      <p className="board-card-type">Group</p>
      {canManage ? (
        <BoardCardTitle
          board={board}
          isEditing={isEditing}
          onStartEditing={() => setIsEditing(true)}
          onCancelEditing={() => setIsEditing(false)}
          onRenameBoard={onRenameBoard}
        />
      ) : (
        <h3 className="board-card-title">{board.name}</h3>
      )}
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
  displayName,
  isAnonymous,
  isAuthenticating,
  onUpgradeWithGoogle,
  onSignOut,
  personalBoards,
  groupBoards,
  pendingInvites,
  manageableWorkspaceIds,
  workspaceRoles,
  onOpenBoard,
  onCreateGroupBoard,
  onCreatePersonalBoard,
  onAcceptInvite,
  onDeleteBoard,
  onRenameBoard,
}: BoardSelectorPageProps) {
  const [newBoardName, setNewBoardName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [creatingType, setCreatingType] = useState<'personal' | 'group' | null>(null)

  function openCreateForm(type: 'personal' | 'group') {
    setCreatingType(type)
    setNewBoardName('')
  }

  async function handleCreateBoard() {
    if (!creatingType) return
    
    setIsCreating(true)
    const handler = creatingType === 'personal' ? onCreatePersonalBoard : onCreateGroupBoard
    const ok = await handler(newBoardName)
    if (ok) {
      setNewBoardName('')
      setCreatingType(null)
    }
    setIsCreating(false)
  }

  return (
    <div className="board-selector-shell">
      <header className="board-selector-topbar">
        <div>
          <p className="eyebrow">Boards</p>
          <h1>Select a Board</h1>
          <p>Choose a personal or group board to continue into your workspace.</p>
        </div>
        <AccountBar
          displayName={displayName}
          userEmail={userEmail}
          isAnonymous={isAnonymous}
          isAuthenticating={isAuthenticating}
          onUpgradeWithGoogle={onUpgradeWithGoogle}
          onSignOut={onSignOut}
        />
      </header>

      {error && <p className="error-banner">{error}</p>}
      {notice && <p className="notice-banner">{notice}</p>}

      <section className="board-list-section">
        <div className="board-list-header">
          <h2>Pending Invites</h2>
          <span>{pendingInvites.length}</span>
        </div>

        {!userEmail ? (
          <div className="board-list-empty">
            Invites are matched by email address. Save this guest workspace with Google to receive
            them.
          </div>
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

      {creatingType && (
        <section className="board-list-section">
          <div className="board-list-header">
            <h2>{creatingType === 'personal' ? 'Create Personal Board' : 'Create Group Board'}</h2>
          </div>
          <div className="create-group-row">
            <input
              value={newBoardName}
              onChange={(event) => setNewBoardName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleCreateBoard()
                } else if (event.key === 'Escape') {
                  setCreatingType(null)
                  setNewBoardName('')
                }
              }}
              placeholder="Write your board name here"
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={() => void handleCreateBoard()}
              disabled={isCreating || !newBoardName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCreatingType(null)
                setNewBoardName('')
              }}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>{personalBoards.length}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => openCreateForm('personal')}
                  disabled={isCreating}
                  title="Create a new personal board"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
                >
                  +
                </button>
              </div>
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
                    onRenameBoard={onRenameBoard}
                  />
                ))}
              </div>
            )}
          </section>


        <section className="board-list-section">
          <div className="board-list-header">
            <h2>Group Boards</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>{groupBoards.length}</span>
              <button
                className="btn btn-secondary"
                onClick={() => openCreateForm('group')}
                disabled={isCreating}
                title="Create a new group board"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
              >
                +
              </button>
            </div>
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
                    onRenameBoard={onRenameBoard}
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
