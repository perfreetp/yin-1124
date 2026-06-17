import React from 'react'

export interface Column<T> {
  key: string
  title: React.ReactNode
  dataIndex?: keyof T
  width?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  render?: (value: any, record: T, index: number) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey?: keyof T
  loading?: boolean
  emptyText?: string
  selectable?: boolean
  selectedRowKeys?: string[]
  onSelectChange?: (keys: string[]) => void
  onRowClick?: (record: T) => void
  pagination?: boolean
  pageSize?: number
  className?: string
  headerClassName?: string
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey = 'id' as keyof T,
  emptyText = '暂无数据',
  selectable = false,
  selectedRowKeys = [],
  onSelectChange,
  onRowClick,
  className = '',
  headerClassName = '',
}: TableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked ? data.map((d) => String(d[rowKey])) : [])
    }
  }

  const handleSelectRow = (key: string, checked: boolean) => {
    if (onSelectChange) {
      if (checked) {
        onSelectChange([...selectedRowKeys, key])
      } else {
        onSelectChange(selectedRowKeys.filter((k) => k !== key))
      }
    }
  }

  const allSelected = data.length > 0 && selectedRowKeys.length === data.length
  const someSelected = selectedRowKeys.length > 0 && selectedRowKeys.length < data.length

  return (
    <div className={`overflow-auto border border-[var(--color-border)] rounded-md ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] ${headerClassName}`}>
            {selectable && (
              <th className="w-10 px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border-dark)] cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left font-medium text-[var(--color-text-secondary)] whitespace-nowrap ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                }`}
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-3 py-12 text-center text-[var(--color-text-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((record, index) => {
              const key = String(record[rowKey])
              const isSelected = selectedRowKeys.includes(key)
              return (
                <tr
                  key={key}
                  className={`border-b border-[var(--color-border-light)] last:border-b-0 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-[var(--color-bg-hover)]' : ''
                  } ${isSelected ? 'bg-[var(--color-primary-bg)]' : ''}`}
                  onClick={() => onRowClick?.(record)}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(key, e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--color-border-dark)] cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const value = col.dataIndex ? record[col.dataIndex] : undefined
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-[var(--color-text-primary)] whitespace-nowrap ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {col.render ? col.render(value, record, index) : (value as React.ReactNode)}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
