import type { ColumnDef, TaskFormState } from './types'

export const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', accent: 'slate' },
  { id: 'in_progress', title: 'In Progress', accent: 'blue' },
  { id: 'in_review', title: 'In Review', accent: 'amber' },
  { id: 'done', title: 'Done', accent: 'green' },
]

export const initialFormState: TaskFormState = {
  title: '',
  description: '',
  priority: 'normal',
  due_date: '',
}
