import React from 'react'
import { useResponsive } from '../../hooks/useResponsive'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
  mobileHidden?: boolean
  priority?: 'high' | 'medium' | 'low' // For responsive priority
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T, index: number) => void
  className?: string
  caption?: string
  stickyHeader?: boolean
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  caption,
  stickyHeader = false,
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useResponsive()

  // Filter columns based on screen size and priority
  const visibleColumns = columns.filter(column => {
    if (isMobile) {
      // On mobile, only show high priority columns and non-hidden columns
      return !column.mobileHidden && (column.priority === 'high' || !column.priority)
    }
    if (isTablet) {
      // On tablet, show high and medium priority columns
      return column.priority !== 'low'
    }
    return true // Show all columns on desktop
  })

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
          <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item, index) => (
          <div
            key={index}
            className={`bg-white shadow rounded-lg p-4 ${
              onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''
            }`}
            onClick={() => onRowClick?.(item, index)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onRowClick(item, index)
              }
            }}
          >
            <div className="space-y-3">
              {visibleColumns.map((column) => (
                <div key={String(column.key)} className="flex justify-between items-start">
                  <dt className="text-sm font-medium text-gray-500 flex-shrink-0 mr-4">
                    {column.header}
                  </dt>
                  <dd className="text-sm text-gray-900 text-right">
                    {column.render ? column.render(item, index) : item[column.key]}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {caption && (
            <caption className="sr-only">
              {caption}
            </caption>
          )}
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.headerClassName || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={index}
                className={`${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gray-50 focus-within:bg-gray-50 transition-colors duration-200'
                    : ''
                }`}
                onClick={() => onRowClick?.(item, index)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRowClick(item, index)
                  }
                }}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.className || ''
                    }`}
                  >
                    {column.render ? column.render(item, index) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Specialized components for common table patterns
interface ActionButtonProps {
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  'aria-label'?: string
}

export const TableActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = 'secondary',
  size = 'sm',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const baseClasses = 'inline-flex items-center border font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200'
  
  const variantClasses = {
    primary: 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  }
  
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs min-h-8',
    md: 'px-3 py-2 text-sm min-h-10',
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation() // Prevent row click when clicking action button
        onClick(e)
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  )
}

// Status badge component for tables
interface StatusBadgeProps {
  status: string
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

export const TableStatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'neutral' }) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {status}
    </span>
  )
}