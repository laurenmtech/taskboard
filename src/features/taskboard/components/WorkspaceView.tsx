import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { COLUMNS } from '../constants'
import type { Task, TaskPriority, Workspace } from '../types'
import { ColumnDropZone } from './ColumnDropZone'
import { TaskCard, TaskCardOverlay } from './TaskCard'
import { TeamView } from './TeamView'

type WorkspaceViewProps = {
  activeWorkspace: Workspace | null
  isLoading: boolean
  isSimulatingAuth: boolean
  search: string
  priorityFilter: 'all' | TaskPriority
  viewMode: 'board' | 'team'
  error: string | null
  summary: { total: number; done: number; overdue: number }
  tasksByStatus: Record<'todo' | 'in_progress' | 'in_review' | 'done', Task[]>
  tasks: Task[]
  filteredTaskCount: number
  activeTask: Task | null
  workspaceMembers: { id: string; display_name: string | null }[]
  onSimulateNewGuest: () => void
  onBackToBoards: () => void
  onSimulateTeamMembers: () => void
  onRefresh: () => void
  onOpenCreateTask: () => void
  onSearchChange: (value: string) => void
  onViewModeChange: (mode: 'board' | 'team') => void
  onPriorityFilterChange: (value: 'all' | TaskPriority) => void
  onDragStart: (taskId: string) => void
  onDragEnd: (activeId: string, overId: string | null) => Promise<void>
  onTeamDragEnd: (activeId: string, overId: string | null) => Promise<void>
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function WorkspaceView({
  activeWorkspace,
  isLoading,
  search,
  priorityFilter,
  viewMode,
  error,
  summary,
  tasksByStatus,
  tasks,
  filteredTaskCount,
  activeTask,
  workspaceMembers,
  onBackToBoards,
  onSimulateTeamMembers,
  onOpenCreateTask,
  onSearchChange,
  onViewModeChange,
  onPriorityFilterChange,
  onDragStart,
  onDragEnd,
  onTeamDragEnd,
  onEditTask,
  onDeleteTask,
}: WorkspaceViewProps) {
  const isGroupBoard = activeWorkspace?.board_type === 'group'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">My Workspace</p>
          <h1>{activeWorkspace?.name ?? 'Kanban Board'}</h1>
          <p className="subtitle">What Can I Accomplish Today?</p>
          
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={onBackToBoards} aria-label="Go back to board selection">
            My Boards
          </button>
          {activeWorkspace?.board_type === 'group' && (
            <button
              className="btn btn-secondary"
              onClick={onSimulateTeamMembers}
              aria-label="Add demo team members"
            >
              Add Demo Members
            </button>
          )}
          <button className="btn btn-primary" onClick={onOpenCreateTask} aria-label="Create a new task">
            New Task
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article>
          <span>Total Tasks</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{summary.done}</strong>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{summary.overdue}</strong>
        </article>
      </section>

      <section className="toolbar">
        <label>
          Search
          <input
            type="search"
            placeholder="Find by title or description"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label>
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => onPriorityFilterChange(event.target.value as 'all' | TaskPriority)}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
        <div className="view-mode-toggle">
          <button
            className={clsx('view-btn', { active: viewMode === 'board' })}
            onClick={() => onViewModeChange('board')}
            aria-label="Switch to board view"
            title="Board View"
          >
            📊 Board
          </button>
          {isGroupBoard && (
            <button
              className={clsx('view-btn', { active: viewMode === 'team' })}
              onClick={() => onViewModeChange('team')}
              aria-label="Switch to team view"
              title="Team View"
            >
              👥 Team
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="error-banner" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {error?.toLowerCase().includes('anonymous auth is disabled') && (
        <section className="setup-callout">
          <h3>Enable Anonymous Sign-In</h3>
          <p>Open Supabase Dashboard, then go to Authentication, Providers, Anonymous, and Enable.</p>
          <p>Then click Refresh to initialize a guest session.</p>
        </section>
      )}

      {(error?.toLowerCase().includes('tasks table is not available yet') ||
        error?.toLowerCase().includes('schema cache') ||
        error?.toLowerCase().includes('could not find the table')) && (
        <section className="setup-callout">
          <h3>Create the Tasks Table</h3>
          <p>Open Supabase SQL Editor and run the SQL from supabase/schema.sql.</p>
          <p>After it completes, click Refresh in this workspace.</p>
        </section>
      )}

      {isLoading ? (
        <section className="loading-state" role="status" aria-live="polite" aria-busy="true">
          <div className="spinner" />
          <p>Loading your board...</p>
        </section>
      ) : viewMode === 'team' && isGroupBoard ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) => onDragStart(String(event.active.id))}
          onDragEnd={(event: DragEndEvent) => {
            void onTeamDragEnd(String(event.active.id), event.over ? String(event.over.id) : null)
          }}
        >
          <TeamView
            tasks={tasks}
            filteredTaskCount={filteredTaskCount}
            workspaceMembers={workspaceMembers}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />

          <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) => onDragStart(String(event.active.id))}
          onDragEnd={(event: DragEndEvent) => {
            void onDragEnd(String(event.active.id), event.over ? String(event.over.id) : null)
          }}
        >
          <main className="board-grid" aria-label="Task board columns">
            {COLUMNS.map((column) => {
              const columnTasks = tasksByStatus[column.id]
              return (
                <section
                  key={column.id}
                  className={clsx('board-column', `accent-${column.accent}`)}
                  aria-label={`${column.title} column with ${columnTasks.length} tasks`}
                >
                  <header>
                    <h2>{column.title}</h2>
                    <span>{columnTasks.length}</span>
                  </header>

                  <SortableContext
                    items={columnTasks.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ColumnDropZone columnId={column.id}>
                      {columnTasks.length === 0 ? (
                        <div className="empty-state">Drop a task here</div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                        ))
                      )}
                    </ColumnDropZone>
                  </SortableContext>
                </section>
              )
            })}
          </main>

          <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
        </DndContext>
      )}

      {!isLoading && filteredTaskCount === 0 && (
        <section className="no-results" role="status" aria-live="polite">
          <h3>No tasks match your filters.</h3>
          <p>Try clearing search or priority filters, or create a new task.</p>
        </section>
      )}
    </div>
  )
}
