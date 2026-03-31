import './App.css'
import { BoardSelectorPage } from './features/taskboard/components/BoardSelectorPage'
import { CreateTaskModal } from './features/taskboard/components/CreateTaskModal'
import { LandingPage } from './features/taskboard/components/LandingPage'
import { WorkspaceView } from './features/taskboard/components/WorkspaceView'
import { useTaskboard } from './features/taskboard/hooks/useTaskboard'

export default function App() {
  const taskboard = useTaskboard()

  if (taskboard.currentView === 'landing') {
    return (
      <LandingPage
        error={taskboard.error}
        isLoading={taskboard.isLoading}
        isCheckingSession={taskboard.isCheckingSession}
        existingSessionUserId={taskboard.existingSessionUserId}
        onStartNewGuestWorkspace={() =>
          void taskboard.bootstrapSession({ forceNewGuest: true, enterWorkspace: true })
        }
        onContinueOrSignIn={() => void taskboard.bootstrapSession({ enterWorkspace: true })}
      />
    )
  }

  if (taskboard.currentView === 'board-picker') {
    return (
      <BoardSelectorPage
        isLoading={taskboard.isLoading}
        error={taskboard.error}
        notice={taskboard.notice}
        userEmail={taskboard.userEmail}
        personalBoards={taskboard.personalWorkspaces}
        groupBoards={taskboard.groupWorkspaces}
        pendingInvites={taskboard.pendingInvites}
          manageableWorkspaceIds={taskboard.manageableWorkspaceIds}
        workspaceRoles={taskboard.workspaceRoles}
        onOpenBoard={(workspaceId) => {
          void taskboard.openWorkspace(workspaceId)
        }}
        onBackToLanding={taskboard.goToLanding}
        onCreateGroupBoard={taskboard.createGroupBoard}
        onAcceptInvite={taskboard.acceptInvite}
        onDeleteBoard={taskboard.deleteBoard}
      />
    )
  }

  return (
    <>
      <WorkspaceView
        activeWorkspace={taskboard.activeWorkspace}
        isLoading={taskboard.isLoading}
        isSimulatingAuth={taskboard.isSimulatingAuth}
        search={taskboard.search}
        priorityFilter={taskboard.priorityFilter}
        viewMode={taskboard.viewMode}
        error={taskboard.error}
        summary={taskboard.summary}
        tasksByStatus={taskboard.tasksByStatus}
        tasks={taskboard.tasks}
        filteredTaskCount={taskboard.filteredTasks.length}
        activeTask={taskboard.activeTask}
        workspaceMembers={taskboard.workspaceMembers}
        onSimulateNewGuest={() => void taskboard.simulateNewGuestSignIn()}
        onBackToBoards={taskboard.goToBoardPicker}
        onSimulateTeamMembers={taskboard.simulateTeamMembers}
        onRefresh={() => void taskboard.refreshCurrentWorkspace()}
        onOpenCreateTask={taskboard.openCreateTaskModal}
        onSearchChange={taskboard.setSearch}
        onPriorityFilterChange={taskboard.setPriorityFilter}
        onViewModeChange={taskboard.setViewMode}
        onDragStart={taskboard.handleDragStart}
        onDragEnd={taskboard.handleDragEnd}
        onTeamDragEnd={taskboard.handleTeamDragEnd}
        onEditTask={taskboard.openEditTaskModal}
        onDeleteTask={(taskId) => {
          void taskboard.deleteTask(taskId)
        }}
      />

      <CreateTaskModal
        isOpen={taskboard.isCreatingTask}
        isSavingTask={taskboard.isSavingTask}
        isEditingTask={!!taskboard.editingTaskId}
        error={taskboard.error}
        formState={taskboard.formState}
        onClose={taskboard.closeTaskModal}
        onSubmit={taskboard.createTask}
        onDeleteTask={() => taskboard.deleteTask(taskboard.editingTaskId ?? '')}
        onUpdateForm={taskboard.updateFormState}
      />
    </>
  )
}
