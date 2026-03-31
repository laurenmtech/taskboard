import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
/// <reference types="react" />
import type { Task } from '../types'
import { ColumnDropZone } from './ColumnDropZone'
import { TaskCard } from './TaskCard'

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
    </div>
  )
}
