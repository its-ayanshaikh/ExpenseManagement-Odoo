import { useState, useCallback, useRef } from 'react'
import { AppError, parseApiError, isRetryableError } from '../utils/errorHandling'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: AppError | null
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: AppError) => void
  retryAttempts?: number
  retryDelay?: number
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>
  reset: () => void
  retry: () => Promise<T | null>
  cancel: () => void
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    onSuccess,
    onError,
    retryAttempts = 0,
    retryDelay = 1000,
  } = options

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const lastArgsRef = useRef<any[]>([])
  const cancelTokenRef = useRef<{ cancelled: boolean }>({ cancelled: false })
  const retryCountRef = useRef(0)

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      // Store args for retry functionality
      lastArgsRef.current = args
      retryCountRef.current = 0

      // Create new cancel token
      cancelTokenRef.current = { cancelled: false }
      const currentCancelToken = cancelTokenRef.current

      setState(prev => ({ ...prev, loading: true, error: null }))

      const attemptRequest = async (attemptNumber: number): Promise<T | null> => {
        try {
          // Check if request was cancelled
          if (currentCancelToken.cancelled) {
            return null
          }

          const result = await apiFunction(...args)

          // Check again after async operation
          if (currentCancelToken.cancelled) {
            return null
          }

          setState({ data: result, loading: false, error: null })
          
          if (onSuccess) {
            onSuccess(result)
          }

          return result
        } catch (error) {
          // Check if request was cancelled
          if (currentCancelToken.cancelled) {
            return null
          }

          const appError = parseApiError(error)

          // Retry logic for retryable errors
          if (
            attemptNumber < retryAttempts &&
            isRetryableError(appError)
          ) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attemptNumber)))
            
            // Check if cancelled during delay
            if (currentCancelToken.cancelled) {
              return null
            }

            return attemptRequest(attemptNumber + 1)
          }

          setState({ data: null, loading: false, error: appError })
          
          if (onError) {
            onError(appError)
          }

          return null
        }
      }

      return attemptRequest(0)
    },
    [apiFunction, onSuccess, onError, retryAttempts, retryDelay]
  )

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastArgsRef.current.length === 0) {
      return null
    }
    return execute(...lastArgsRef.current)
  }, [execute])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
    retryCountRef.current = 0
    lastArgsRef.current = []
  }, [])

  const cancel = useCallback(() => {
    cancelTokenRef.current.cancelled = true
    setState(prev => ({ ...prev, loading: false }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    retry,
    cancel,
  }
}

// Hook for handling multiple API calls
export function useApiMultiple<T>(
  apiFunctions: Array<(...args: any[]) => Promise<T>>,
  options: UseApiOptions = {}
) {
  const [states, setStates] = useState<UseApiState<T>[]>(
    apiFunctions.map(() => ({ data: null, loading: false, error: null }))
  )

  const executeAll = useCallback(
    async (...argsArray: any[][]): Promise<(T | null)[]> => {
      setStates(prev => prev.map(state => ({ ...state, loading: true, error: null })))

      const results = await Promise.allSettled(
        apiFunctions.map((fn, index) => fn(...(argsArray[index] || [])))
      )

      const newStates = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { data: result.value, loading: false, error: null }
        } else {
          const appError = parseApiError(result.reason)
          return { data: null, loading: false, error: appError }
        }
      })

      setStates(newStates)

      return newStates.map(state => state.data)
    },
    [apiFunctions]
  )

  const reset = useCallback(() => {
    setStates(apiFunctions.map(() => ({ data: null, loading: false, error: null })))
  }, [apiFunctions])

  return {
    states,
    executeAll,
    reset,
    loading: states.some(state => state.loading),
    hasErrors: states.some(state => state.error !== null),
    errors: states.map(state => state.error).filter(Boolean) as AppError[],
  }
}

// Legacy export for backward compatibility
export default useApi