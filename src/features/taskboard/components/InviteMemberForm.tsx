import { useState } from 'react'
import type { WorkspaceRole } from '../types'

type InviteMemberFormProps = {
  workspaceId: string
  onInviteMember: (
    workspaceId: string,
    inviteeEmail: string,
    role: WorkspaceRole,
  ) => Promise<boolean>
  onClose: () => void
}

export function InviteMemberForm({ workspaceId, onInviteMember, onClose }: InviteMemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const [isSending, setIsSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleInvite() {
    setIsSending(true)
    const invitee = email.trim()
    const ok = await onInviteMember(workspaceId, invitee, role)
    setIsSending(false)

    if (ok) {
      setSentTo(invitee.toLowerCase())
      setEmail('')
    }
  }

  return (
    <section className="invite-panel">
      <div className="invite-panel-header">
        <h2>Invite a member</h2>
        <button className="btn btn-ghost btn-compact" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="invite-panel-row">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setSentTo(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleInvite()
            }
          }}
          placeholder="teammate@example.com"
          aria-label="Member email address"
          disabled={isSending}
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as WorkspaceRole)}
          aria-label="Role on join"
          disabled={isSending}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary" onClick={() => void handleInvite()} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send Invite'}
        </button>
      </div>

      {sentTo && (
        <p className="invite-panel-note">
          Invite created for <strong>{sentTo}</strong>. It appears on their board list once they
          sign in with that Google address.
        </p>
      )}
      <p className="invite-panel-hint">
        Invites are matched on email address, so it must match the Google account they sign in with.
      </p>
    </section>
  )
}
