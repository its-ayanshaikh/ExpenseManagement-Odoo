import { useCallback } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { AppError, parseApiError, getErrorDisplayMessage, getErrorTitle, isRetryableError } from '../utils/errorHandling'

interface UseErrorHandlerOptions {
  showNotification?: boolean
  logError?: boolean
  onError?: (error: AppError) => void
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showNotification = true, logError = true, onError } = options
  const { showError, showWarning } = useNotifications()

  const handleError = useCallback((error: unknown, context?: string) => {
    const appError = parseApiError(error)

    // Log error if enabled
    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, appError)
    }

    // Show notification if enabled
    if (showNotification) {
      const title = getErrorTitle(appError)
      const message = getErrorDisplayMessage(appError)
      
      if (isRetryableError(appError)) {
        showWarning(message, title, {
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: () => {
              // This would need to be handled by the calling component
              console.log('Retry requested for:', appError)
            }
          }
        })
      } else {
        showError(message, title)
      }
    }

    // Call custom error handler if provided
    if (onError) {
      onError(appError)
    }

    return appError
  }, [showNotification, logError, onError, showError, showWarning])

  const handleApiError = useCallback((error: unknown, context?: string) => {
    return handleError(error, context)
  }, [handleError])

  const handleValidationError = useCallback((error: AppError, context?: string) => {
    if (showNotification) {
      showError(error.message, 'Validation Error')
    }

    if (logError) {
      console.error(`Validation error${context ? ` in ${context}` : ''}:`, error)
    }

    if (onError) {
      onError(error)
    }

    return error
  }, [showNotification, logError, onError, showError])

  const handleNetworkError = useCallback((context?: string) => {
    const error: AppError = {
      type: 'NETWORK' as const,
      message: 'Network connection failed',
      retryable: true,
    }

    return handleError(error, context)
  }, [handleError])

  const handleTimeoutError = useCallback((context?: string) => {
    const error: AppError = {
      type: 'TIMEOUT' as const,
      message: 'Request timed out',
      retryable: true,
    }

    return handleError(error, context)
  }, [handleError])

  return {
    handleError,
    handleApiError,
    handleValidationError,
    handleNetworkError,
    handleTimeoutError,
  }
}

// Hook for handling form submission errors
export function useFormErrorHandler() {
  const { showError } = useNotifications()
  const { handleError } = useErrorHandler({ showNotification: false })

  const handleSubmissionError = useCallback((error: unknown, setFieldErrors?: (errors: Record<string, string>) => void) => {
    const appError = handleError(error, 'Form submission')

    if (appError.type === 'VALIDATION' && appError.details && setFieldErrors) {
      try {
        const validationErrors = JSON.parse(appError.details)
        const fieldErrors: Record<string, string> = {}
        
        Object.keys(validationErrors).forEach(field => {
          const errors = validationErrors[field]
          if (Array.isArray(errors) && errors.length > 0) {
            fieldErrors[field] = errors[0]
          }
        })
        
        setFieldErrors(fieldErrors)
      } catch {
        // If parsing fails, show general error
        showError(appError.message, 'Validation Error')
      }
    } else {
      // Show general error notification
      showError(getErrorDisplayMessage(appError), getErrorTitle(appError))
    }

    return appError
  }, [handleError, showError])

  return {
    handleSubmissionError,
  }
}