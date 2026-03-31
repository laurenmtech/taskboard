import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { format, formatDistanceToNow, isBefore } from 'date-fns'
import type { Task } from '../types'

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

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
