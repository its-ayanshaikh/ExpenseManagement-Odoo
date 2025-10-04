import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage, NetworkError } from './ErrorMessage'
import { AppError } from '../../utils/errorHandling'

interface AsyncContentProps {
  loading: boolean
  error: AppError | null
  children: React.ReactNode
  loadingText?: string
  emptyState?: React.ReactNode
  onRetry?: () => void
  className?: string
  minHeight?: string
}

export const AsyncContent: React.FC<AsyncContentProps> = ({
  loading,
  error,
  children,
  loadingText = 'Loading...',
  emptyState,
  onRetry,
  className = '',
  minHeight = 'min-h-32',
}) => {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${minHeight} ${className}`}>
        <LoadingSpinner text={loadingText} />
      </div>
    )
  }

  if (error) {
    if (error.type === 'NETWORK') {
      return (
        <div className={`${minHeight} ${className}`}>
          <NetworkError onRetry={onRetry} />
        </div>
      )
    }

    return (
      <div className={`${minHeight} ${className}`}>
        <ErrorMessage
          type="error"
          title={getErrorTitle(error)}
          message={error.message}
          onRetry={error.retryable ? onRetry : undefined}
        />
      </div>
    )
  }

  // Show empty state if no children and emptyState is provided
  if (!children && emptyState) {
    return (
      <div className={`${minHeight} ${className}`}>
        {emptyState}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

// Helper function to get error title
const getErrorTitle = (error: AppError): string => {
  switch (error.type) {
    case 'NETWORK':
      return 'Connection Error'
    case 'TIMEOUT':
      return 'Timeout Error'
    case 'AUTHENTICATION':
      return 'Authentication Required'
    case 'AUTHORIZATION':
      return 'Access Denied'
    case 'NOT_FOUND':
      return 'Not Found'
    case 'VALIDATION':
      return 'Validation Error'
    case 'SERVER':
      return 'Server Error'
    default:
      return 'Error'
  }
}

// Specialized component for data lists
interface AsyncListProps<T> {
  loading: boolean
  error: AppError | null
  data: T[] | null
  renderItem: (item: T, index: number) => React.ReactNode
  emptyMessage?: string
  loadingText?: string
  onRetry?: () => void
  className?: string
  itemClassName?: string
}

export function AsyncList<T>({
  loading,
  error,
  data,
  renderItem,
  emptyMessage = 'No items found',
  loadingText = 'Loading...',
  onRetry,
  className = '',
  itemClassName = '',
}: AsyncListProps<T>) {
  const emptyState = (
    <div className="text-center py-8">
      <div className="text-gray-400 text-lg mb-2">📋</div>
      <p className="text-gray-600">{emptyMessage}</p>
    </div>
  )

  return (
    <AsyncContent
      loading={loading}
      error={error}
      onRetry={onRetry}
      className={className}
      emptyState={!data || data.length === 0 ? emptyState : undefined}
    >
      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className={itemClassName}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </AsyncContent>
  )
}

// Component for handling form submission states
interface AsyncFormProps {
  children: React.ReactNode
  loading: boolean
  error: AppError | null
  onRetry?: () => void
  className?: string
}

export const AsyncForm: React.FC<AsyncFormProps> = ({
  children,
  loading,
  error,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <LoadingSpinner text="Submitting..." />
        </div>
      )}
      
      {/* Error display */}
      {error && !loading && (
        <div className="mt-4">
          <ErrorMessage
            type="error"
            message={error.message}
            onRetry={error.retryable ? onRetry : undefined}
          />
        </div>
      )}
    </div>
  )
}