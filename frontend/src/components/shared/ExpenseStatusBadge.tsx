import React from 'react'
import { ExpenseStatus } from '../../types'

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ExpenseStatusBadge: React.FC<ExpenseStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const getStatusConfig = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.PENDING:
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
          label: 'Pending',
        }
      case ExpenseStatus.APPROVED:
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          label: 'Approved',
        }
      case ExpenseStatus.REJECTED:
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
          label: 'Rejected',
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          label: 'Unknown',
        }
    }
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'md':
        return 'px-3 py-1 text-sm'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const config = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.color}
        ${sizeClasses}
        ${className}
      `}
    >
      <span className="leading-none">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

// Helper component for status with custom text
interface CustomStatusBadgeProps {
  status: ExpenseStatus
  text: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const CustomStatusBadge: React.FC<CustomStatusBadgeProps> = ({
  status,
  text,
  className = '',
  size = 'md',
}) => {
  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case ExpenseStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200'
      case ExpenseStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'md':
        return 'px-3 py-1 text-sm'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const colorClasses = getStatusColor(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${colorClasses}
        ${sizeClasses}
        ${className}
      `}
    >
      {text}
    </span>
  )
}