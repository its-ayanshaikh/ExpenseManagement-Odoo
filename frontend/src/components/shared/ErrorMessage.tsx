import React from 'react'

interface ErrorMessageProps {
  message: string
  title?: string
  type?: 'error' | 'warning' | 'info'
  className?: string
  onDismiss?: () => void
  onRetry?: () => void
  showIcon?: boolean
  fullWidth?: boolean
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  type = 'error',
  className = '',
  onDismiss,
  onRetry,
  showIcon = true,
  fullWidth = true,
}) => {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          titleColor: 'text-red-900',
          icon: '❌',
        }
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900',
          icon: '⚠️',
        }
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900',
          icon: 'ℹ️',
        }
      default:
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          titleColor: 'text-red-900',
          icon: '❌',
        }
    }
  }

  const config = getTypeConfig(type)

  return (
    <div
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${config.bgColor}
        ${config.borderColor}
        border rounded-md p-4
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0 mr-3">
            <span className="text-lg">{config.icon}</span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${config.textColor}`}>
            {message}
          </p>
          
          {/* Action buttons */}
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`
                    text-sm font-medium underline hover:no-underline
                    ${config.textColor}
                  `}
                >
                  Try again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`
                    text-sm font-medium underline hover:no-underline
                    ${config.textColor}
                  `}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Close button */}
        {onDismiss && (
          <div className="flex-shrink-0 ml-3">
            <button
              type="button"
              onClick={onDismiss}
              className={`
                inline-flex rounded-md p-1.5 hover:bg-opacity-20 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${config.textColor}
              `}
              aria-label="Dismiss error message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline error message for form fields
interface InlineErrorProps {
  message: string
  className?: string
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  className = '',
}) => {
  return (
    <p className={`text-sm text-red-600 mt-1 ${className}`}>
      {message}
    </p>
  )
}

// Error boundary fallback component
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <ErrorMessage
          type="error"
          title="Something went wrong"
          message={error.message || 'An unexpected error occurred'}
          onRetry={resetError}
          className="mb-4"
        />
        
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}

// Network error component
interface NetworkErrorProps {
  onRetry?: () => void
  className?: string
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  className = '',
}) => {
  return (
    <ErrorMessage
      type="error"
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  )
}

// Not found error component
interface NotFoundErrorProps {
  resource?: string
  onGoBack?: () => void
  className?: string
}

export const NotFoundError: React.FC<NotFoundErrorProps> = ({
  resource = 'resource',
  onGoBack,
  className = '',
}) => {
  return (
    <ErrorMessage
      type="warning"
      title="Not Found"
      message={`The ${resource} you're looking for doesn't exist or has been removed.`}
      onRetry={onGoBack ? () => onGoBack() : undefined}
      className={className}
    />
  )
}