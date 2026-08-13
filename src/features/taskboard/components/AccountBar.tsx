type AccountBarProps = {
  displayName: string | null
  userEmail: string | null
  isAnonymous: boolean
  isAuthenticating: boolean
  onUpgradeWithGoogle: () => void
  onSignOut: () => void
}

export function AccountBar({
  displayName,
  userEmail,
  isAnonymous,
  isAuthenticating,
  onUpgradeWithGoogle,
  onSignOut,
}: AccountBarProps) {
  const label = displayName ?? userEmail ?? 'Guest'
  const initial = label.trim().charAt(0).toUpperCase() || 'G'

  return (
    <div className="account-bar">
      <div className="account-identity">
        <span className="account-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="account-meta">
          <strong>{isAnonymous ? 'Guest workspace' : label}</strong>
          <small>{isAnonymous ? 'Saved in this browser only' : userEmail}</small>
        </span>
      </div>

      <div className="account-actions">
        {isAnonymous && (
          <button className="btn btn-google btn-compact" onClick={onUpgradeWithGoogle} disabled={isAuthenticating}>
            {isAuthenticating ? 'Redirecting...' : 'Save with Google'}
          </button>
        )}
        <button className="btn btn-secondary btn-compact" onClick={onSignOut} disabled={isAuthenticating}>
          {isAnonymous ? 'Exit' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
