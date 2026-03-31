import type { FormEvent } from 'react'
import type { TaskFormState, TaskPriority } from '../types'

type CreateTaskModalProps = {
  isOpen: boolean
  isSavingTask: boolean
  isEditingTask: boolean
  error: string | null
  formState: TaskFormState
  onClose: () => void
  onSubmit: () => Promise<unknown>
  onDeleteTask: () => Promise<unknown>
  onUpdateForm: <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void
}

export function CreateTaskModal({
  isOpen,
  isSavingTask,
  isEditingTask,
  error,
  formState,
  onClose,
  onSubmit,
  onDeleteTask,
  onUpdateForm,
}: CreateTaskModalProps) {
  if (!isOpen) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="create-task-title">{isEditingTask ? 'Edit Task' : 'Create Task'}</h3>
        {error && (
          <p className="modal-error" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              value={formState.title}
              onChange={(event) => onUpdateForm('title', event.target.value)}
              placeholder="Prepare Q2 roadmap"
              required
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={formState.description}
              onChange={(event) => onUpdateForm('description', event.target.value)}
              placeholder="Add context and acceptance notes"
            />
          </label>
          <div className="modal-row">
            <label>
              Priority
              <select
                value={formState.priority}
                onChange={(event) => onUpdateForm('priority', event.target.value as TaskPriority)}
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Due Date
              <input
                type="date"
                value={formState.due_date}
                onChange={(event) => onUpdateForm('due_date', event.target.value)}
              />
            </label>
          </div>
          <footer className="modal-actions">
            {isEditingTask && (
              <button type="button" className="btn btn-secondary" onClick={() => void onDeleteTask()}>
                Delete Task
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSavingTask}>
              {isSavingTask ? 'Saving...' : isEditingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
