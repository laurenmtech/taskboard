import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
/// <reference types="react" />
import type { Task } from '../types'
import { ColumnDropZone } from './ColumnDropZone'
import { TaskCard } from './TaskCard'

const DAY_MS = 24 * 60 * 60 * 1000

function parseDateMs(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function formatTimelineDate(value: number) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

type TeamViewProps = {
  tasks: Task[]
  filteredTaskCount: number
  workspaceMembers: { id: string; display_name: string | null }[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function TeamView({
  tasks,
  filteredTaskCount,
  workspaceMembers,
  onEditTask,
  onDeleteTask,
}: TeamViewProps) {
  // Group tasks by assignee
  const tasksByAssignee = workspaceMembers.reduce(
    (acc, member) => {
      const memberTasks = tasks.filter((t) => t.assignee_id === member.id)
      acc[member.id] = memberTasks
      return acc
    },
    {} as Record<string, Task[]>,
  )

  // Also include unassigned tasks
  const unassignedTasks = tasks.filter((t) => !t.assignee_id)

  const timelineRows = tasks
    .map((task) => {
      const startMs = parseDateMs(task.created_at)
      if (startMs === null) {
        return null
      }

      const dueMs = parseDateMs(task.due_date)
      const endMs = dueMs !== null ? Math.max(startMs, dueMs) : startMs + DAY_MS

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        startMs,
        endMs,
      }
    })
    .filter((row): row is { id: string; title: string; status: Task['status']; startMs: number; endMs: number } => !!row)
    .sort((a, b) => a.startMs - b.startMs)

  const timelineStartMs = timelineRows.length > 0 ? Math.min(...timelineRows.map((row) => row.startMs)) : null
  const timelineEndMsRaw = timelineRows.length > 0 ? Math.max(...timelineRows.map((row) => row.endMs)) : null
  const timelineEndMs =
    timelineStartMs !== null && timelineEndMsRaw !== null && timelineEndMsRaw === timelineStartMs
      ? timelineEndMsRaw + DAY_MS
      : timelineEndMsRaw
  const timelineRangeMs =
    timelineStartMs !== null && timelineEndMs !== null ? Math.max(DAY_MS, timelineEndMs - timelineStartMs) : null

  const timelineBars =
    timelineStartMs !== null && timelineRangeMs !== null
      ? timelineRows.map((row) => {
          const leftPct = ((row.startMs - timelineStartMs) / timelineRangeMs) * 100
          const widthPct = Math.max(((row.endMs - row.startMs) / timelineRangeMs) * 100, 1.6)

          return {
            ...row,
            leftPct,
            widthPct,
          }
        })
      : []

  return (
    <div className="team-view">
      {/* Unassigned Tasks Section */}
      <section className="team-column">
        <header className="team-column-header">
          <h3>📌 Unassigned</h3>
          <span className="task-count">{unassignedTasks.length}</span>
        </header>
        <SortableContext
          items={unassignedTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <ColumnDropZone
            columnId="team-unassigned"
            className="team-column-content"
            overClassName="team-column-content-over"
          >
            {unassignedTasks.length === 0 ? (
              <p className="empty-state">Drop a task here</p>
            ) : (
              unassignedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
              ))
            )}
          </ColumnDropZone>
        </SortableContext>
      </section>

      {/* Member Task Sections */}
      {workspaceMembers.map((member) => {
        const memberTasks = tasksByAssignee[member.id] || []
        const displayName = member.display_name || `User ${member.id.slice(0, 8)}`
        const memberInitial = displayName.charAt(0).toUpperCase()

        return (
          <section key={member.id} className="team-column">
            <header className="team-column-header">
              <div className="member-header">
                <span className="member-avatar">{memberInitial}</span>
                <h3>{displayName}</h3>
              </div>
              <span className="task-count">{memberTasks.length}</span>
            </header>
            <SortableContext items={memberTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              <ColumnDropZone
                columnId={`team-member-${member.id}`}
                className="team-column-content"
                overClassName="team-column-content-over"
              >
                {memberTasks.length === 0 ? (
                  <p className="empty-state">Drop a task here</p>
                ) : (
                  memberTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                  ))
                )}
              </ColumnDropZone>
            </SortableContext>
          </section>
        )
      })}

      {filteredTaskCount === 0 && workspaceMembers.length === 0 && unassignedTasks.length === 0 && (
        <p className="empty-state" style={{ gridColumn: '1 / -1' }}>
          No tasks yet. Create one to get started!
        </p>
      )}

      {timelineStartMs !== null && timelineEndMs !== null && timelineBars.length > 0 && (
        <section className="team-timeline" aria-label="Project timeline">
          <header className="team-timeline-header">
            <div>
              <h3>Project Timeline</h3>
              <p>Gantt-inspired map from first task start to latest due date.</p>
            </div>
            <p className="team-timeline-range">
              <span>{formatTimelineDate(timelineStartMs)}</span>
              <span>{formatTimelineDate(timelineEndMs)}</span>
            </p>
          </header>

          <div className="team-timeline-grid" role="list">
            {timelineBars.map((row) => (
              <div className="timeline-row" key={row.id} role="listitem">
                <p className="timeline-row-title" title={row.title}>
                  {row.title}
                </p>
                <div className="timeline-track" aria-hidden="true">
                  <span
                    className={`timeline-bar timeline-bar-${row.status}`}
                    style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
