import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red'
  className?: string
  text?: string
  fullScreen?: boolean
  'aria-label'?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
  text,
  fullScreen = false,
  'aria-label': ariaLabel,
}) => {
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-6 h-6'
      case 'lg':
        return 'w-8 h-8'
      case 'xl':
        return 'w-12 h-12'
      default:
        return 'w-6 h-6'
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600'
      case 'gray':
        return 'text-gray-600'
      case 'white':
        return 'text-white'
      case 'green':
        return 'text-green-600'
      case 'red':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  const getTextSize = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-base'
      case 'lg':
        return 'text-lg'
      case 'xl':
        return 'text-xl'
      default:
        return 'text-base'
    }
  }

  const sizeClasses = getSizeClasses(size)
  const colorClasses = getColorClasses(color)
  const textSizeClasses = getTextSize(size)

  const spinner = (
    <div 
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || text || 'Loading'}
    >
      <div className="flex flex-col items-center space-y-2">
        <svg
          className={`animate-spin ${sizeClasses} ${colorClasses}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {text && (
          <p className={`${textSizeClasses} ${colorClasses} font-medium`} aria-hidden="true">
            {text}
          </p>
        )}
        {/* Screen reader only text */}
        <span className="sr-only">
          {ariaLabel || text || 'Loading, please wait'}
        </span>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Loading"
      >
        {spinner}
      </div>
    )
  }

  return spinner
}

// Inline spinner for buttons and small spaces
interface InlineSpinnerProps {
  size?: 'xs' | 'sm' | 'md'
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red'
  className?: string
}

export const InlineSpinner: React.FC<InlineSpinnerProps> = ({
  size = 'sm',
  color = 'blue',
  className = '',
}) => {
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'xs':
        return 'w-3 h-3'
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-5 h-5'
      default:
        return 'w-4 h-4'
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600'
      case 'gray':
        return 'text-gray-600'
      case 'white':
        return 'text-white'
      case 'green':
        return 'text-green-600'
      case 'red':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  const sizeClasses = getSizeClasses(size)
  const colorClasses = getColorClasses(color)

  return (
    <svg
      className={`animate-spin ${sizeClasses} ${colorClasses} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Loading overlay for specific components
interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  className?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  )
}