import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Task } from '../types'
import { TaskCard } from './TaskCard'

type TeamViewProps = {
  tasks: Task[]
  filteredTaskCount: number
  workspaceMembers: { id: string; display_name: string | null }[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

function TeamColumnDropZone({
  zoneId,
  children,
}: {
  zoneId: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId })

  return (
    <div ref={setNodeRef} className={clsx('team-column-content', isOver && 'team-column-content-over')}>
      {children}
    </div>
  )
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
          <TeamColumnDropZone zoneId="team-unassigned">
            {unassignedTasks.length === 0 ? (
              <p className="empty-state">Drop a task here</p>
            ) : (
              unassignedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
              ))
            )}
          </TeamColumnDropZone>
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
              <TeamColumnDropZone zoneId={`team-member-${member.id}`}>
                {memberTasks.length === 0 ? (
                  <p className="empty-state">Drop a task here</p>
                ) : (
                  memberTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                  ))
                )}
              </TeamColumnDropZone>
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
