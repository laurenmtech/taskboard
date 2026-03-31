import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { TaskStatus } from '../types'

export function ColumnDropZone({
  columnId,
  children,
}: {
  columnId: TaskStatus
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <div ref={setNodeRef} className={clsx('column-body', isOver && 'column-body-over')}>
      {children}
    </div>
  )
}
