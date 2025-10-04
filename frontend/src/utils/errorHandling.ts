import { AxiosError } from 'axios'

// Error types for better error handling
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType
  message: string
  details?: string
  statusCode?: number
  field?: string // For validation errors
  retryable?: boolean
}

// Extract user-friendly error message from various error types
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  
  return 'An unexpected error occurred'
}

// Parse API errors from axios responses
export const parseApiError = (error: unknown): AppError => {
  if (error instanceof AxiosError) {
    const response = error.response
    const request = error.request
    
    // Network error (no response received)
    if (!response && request) {
      return {
        type: ErrorType.NETWORK,
        message: 'Unable to connect to the server. Please check your internet connection.',
        retryable: true,
      }
    }
    
    // Timeout error
    if (error.code === 'ECONNABORTED') {
      return {
        type: ErrorType.TIMEOUT,
        message: 'Request timed out. Please try again.',
        retryable: true,
      }
    }
    
    // Response received with error status
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 400:
          return {
            type: ErrorType.VALIDATION,
            message: data?.message || 'Invalid request data',
            details: data?.details,
            field: data?.field,
            statusCode: status,
            retryable: false,
          }
        
        case 401:
          return {
            type: ErrorType.AUTHENTICATION,
            message: data?.message || 'Authentication required. Please log in.',
            statusCode: status,
            retryable: false,
          }
        
        case 403:
          return {
            type: ErrorType.AUTHORIZATION,
            message: data?.message || 'You do not have permission to perform this action.',
            statusCode: status,
            retryable: false,
          }
        
        case 404:
          return {
            type: ErrorType.NOT_FOUND,
            message: data?.message || 'The requested resource was not found.',
            statusCode: status,
            retryable: false,
          }
        
        case 422:
          return {
            type: ErrorType.VALIDATION,
            message: data?.message || 'Validation failed',
            details: data?.errors ? JSON.stringify(data.errors) : undefined,
            statusCode: status,
            retryable: false,
          }
        
        case 429:
          return {
            type: ErrorType.SERVER,
            message: 'Too many requests. Please wait a moment and try again.',
            statusCode: status,
            retryable: true,
          }
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: ErrorType.SERVER,
            message: data?.message || 'Server error. Please try again later.',
            statusCode: status,
            retryable: true,
          }
        
        default:
          return {
            type: ErrorType.SERVER,
            message: data?.message || `Server returned error ${status}`,
            statusCode: status,
            retryable: status >= 500,
          }
      }
    }
  }
  
  // Generic error fallback
  return {
    type: ErrorType.UNKNOWN,
    message: getErrorMessage(error),
    retryable: false,
  }
}

// Get user-friendly error message based on error type
export const getErrorDisplayMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Network connection failed. Please check your internet connection and try again.'
    
    case ErrorType.TIMEOUT:
      return 'Request timed out. The server is taking too long to respond.'
    
    case ErrorType.AUTHENTICATION:
      return 'Your session has expired. Please log in again.'
    
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.'
    
    case ErrorType.NOT_FOUND:
      return 'The requested information could not be found.'
    
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.'
    
    case ErrorType.SERVER:
      return 'Server error. Please try again in a few moments.'
    
    default:
      return error.message || 'An unexpected error occurred.'
  }
}

// Check if error is retryable
export const isRetryableError = (error: AppError): boolean => {
  return error.retryable === true
}

// Get error title based on type
export const getErrorTitle = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Connection Error'
    
    case ErrorType.TIMEOUT:
      return 'Timeout Error'
    
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required'
    
    case ErrorType.AUTHORIZATION:
      return 'Access Denied'
    
    case ErrorType.NOT_FOUND:
      return 'Not Found'
    
    case ErrorType.VALIDATION:
      return 'Validation Error'
    
    case ErrorType.SERVER:
      return 'Server Error'
    
    default:
      return 'Error'
  }
}

// Form validation error handling
export interface ValidationErrors {
  [field: string]: string[]
}

export const parseValidationErrors = (error: AppError): ValidationErrors => {
  if (error.type !== ErrorType.VALIDATION || !error.details) {
    return {}
  }
  
  try {
    return JSON.parse(error.details)
  } catch {
    return {}
  }
}

// Get first validation error for a field
export const getFieldError = (errors: ValidationErrors, field: string): string | undefined => {
  const fieldErrors = errors[field]
  return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined
}

// Check if there are any validation errors
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0
}

// Log error for debugging (in development) or error reporting (in production)
export const logError = (error: Error | AppError, context?: string) => {
  if (import.meta.env.DEV) {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
  } else {
    // In production, you might want to send to an error reporting service
    // Example: sendToErrorReporting(error, context)
  }
}

// Create a standardized error for throwing
export const createError = (type: ErrorType, message: string, details?: any): AppError => {
  return {
    type,
    message,
    details: details ? JSON.stringify(details) : undefined,
    retryable: [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER].includes(type),
  }
}