import type { ReactNode } from 'react'

export interface TableColumn<T> {
  key: string
  header: ReactNode
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Array<TableColumn<T>>
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  getRowKey: (row: T, index: number) => string | number
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  getRowKey,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ruled bg-paper-surface shadow-tape">
      <table className="min-w-full divide-y divide-ruled text-sm">
        <thead className="bg-paper">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left font-medium text-ink-muted ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ruled-soft">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-faint">
                Carregando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-faint">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={getRowKey(row, index)} className="hover:bg-paper">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-ink ${column.className ?? ''}`}>
                    {column.render ? column.render(row) : '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
