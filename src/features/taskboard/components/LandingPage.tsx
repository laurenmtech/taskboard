type LandingPageProps = {
  error: string | null
  isLoading: boolean
  isCheckingSession: boolean
  isAuthenticating: boolean
  existingSessionUserId: string | null
  onSignInWithGoogle: () => void
  onStartNewGuestWorkspace: () => void
  onContinueOrSignIn: () => void
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export function LandingPage({
  error,
  isLoading,
  isCheckingSession,
  isAuthenticating,
  existingSessionUserId,
  onSignInWithGoogle,
  onStartNewGuestWorkspace,
  onContinueOrSignIn,
}: LandingPageProps) {
  const busy = isLoading || isCheckingSession || isAuthenticating

  return (
    <div className="landing-shell">
      <section className="landing-card">
        <p className="eyebrow">Kanban Spaces</p>
        <h1>Welcome to your task workspace</h1>
        <p>
          Sign in to keep your boards across devices, or try it instantly as a guest.
        </p>

        {error && <p className="error-banner">{error}</p>}

        <div className="landing-actions">
          <button className="btn btn-google" onClick={onSignInWithGoogle} disabled={busy}>
            <GoogleMark />
            {isAuthenticating ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </div>

        <div className="landing-divider">
          <span>or</span>
        </div>

        <div className="landing-actions">
          <button className="btn btn-secondary" onClick={onStartNewGuestWorkspace} disabled={busy}>
            {isLoading ? 'Starting...' : 'Start New Guest Workspace'}
          </button>
          {existingSessionUserId && (
            <button className="btn btn-ghost" onClick={onContinueOrSignIn} disabled={busy}>
              Continue Existing Session
            </button>
          )}
        </div>

        <p className="disclaimer">
          Guest sessions live in this browser only. You can save a guest workspace to a Google
          account later without losing any boards.
        </p>
      </section>
    </div>
  )
}
