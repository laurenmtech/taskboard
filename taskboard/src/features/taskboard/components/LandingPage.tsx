type LandingPageProps = {
  error: string | null
  isLoading: boolean
  isCheckingSession: boolean
  existingSessionUserId: string | null
  onStartNewGuestWorkspace: () => void
  onContinueOrSignIn: () => void
}

export function LandingPage({
  error,
  isLoading,
  isCheckingSession,
  existingSessionUserId,
  onStartNewGuestWorkspace,
  onContinueOrSignIn,
}: LandingPageProps) {
  return (
    <div className="landing-shell">
      <section className="landing-card">
        <p className="eyebrow">Kanban Spaces</p>
        <h1>Welcome to your task workspace</h1>
        <p>
          Start a fresh guest workspace or continue with your existing local session.
        </p>

        {error && <p className="error-banner">{error}</p>}

        <div className="landing-actions">
          <button
            className="btn btn-primary"
            onClick={onStartNewGuestWorkspace}
            disabled={isLoading || isCheckingSession}
          >
            {isLoading ? 'Starting...' : 'Start New Guest Workspace'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onContinueOrSignIn}
            disabled={isLoading || isCheckingSession}
          >
            {existingSessionUserId ? 'Continue Existing Session' : 'Sign In as Guest'}
          </button>
        </div>

       <p className="disclaimer">
          This is a demo application. Guest sessions are stored locally and will not persist if you clear your browser data or switch browsers.
        </p>
      </section>
    </div>
  )
}
