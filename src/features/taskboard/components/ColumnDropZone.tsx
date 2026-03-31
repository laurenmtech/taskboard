import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { TaskStatus } from '../types'

export function ColumnDropZone({
  columnId,
  children,
  className,
  overClassName,
}: {
  columnId: TaskStatus | string
  children: ReactNode
  className?: string
  overClassName?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      className={clsx('column-body', className, isOver && (overClassName ?? 'column-body-over'))}
    >
      {children}
    </div>
  )
}
