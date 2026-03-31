/// <reference types="react" />
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { format, formatDistanceToNow, isBefore } from 'date-fns'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Task } from '../types'

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, resizeObserverConfig: {} })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate ? isBefore(dueDate, new Date()) && task.status !== 'done' : false
  const dueBadge = dueDate
    ? isOverdue
      ? 'Overdue'
      : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`
    : null

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx('task-card', isDragging && 'task-card-dragging')}
      aria-label={`Task ${task.title}, priority ${task.priority}${dueBadge ? `, ${dueBadge}` : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="task-card-top">
        <h4>{task.title}</h4>
        <span className={clsx('priority-pill', `priority-${task.priority}`)}>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
      <div className="task-card-actions">
        <button
          type="button"
          className="task-link-btn"
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation()}
          onClick={(event: ReactPointerEvent<HTMLButtonElement>) => {
            event.stopPropagation()
            onEdit(task)
          }}
          aria-label={`Edit ${task.title}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="task-link-btn task-link-btn-danger"
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation()}
          onClick={(event: ReactPointerEvent<HTMLButtonElement>) => {
            event.stopPropagation()
            onDelete(task.id)
          }}
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </button>
      </div>
      <footer className="task-card-footer">
        {dueDate && <span className={clsx('due-pill', isOverdue && 'due-overdue')}>{dueBadge}</span>}
        <time dateTime={task.created_at}>{format(new Date(task.created_at), 'MMM d')}</time>
      </footer>
    </article>
  )
}

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <article className="task-card task-card-overlay" aria-hidden="true">
      <div className="task-card-top">
        <h4>{task.title}</h4>
        <span className={clsx('priority-pill', `priority-${task.priority}`)}>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
    </article>
  )
}
