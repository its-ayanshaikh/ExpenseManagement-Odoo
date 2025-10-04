import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useNotifications } from '../contexts/NotificationContext'
import { AsyncContent, AsyncList } from './shared/AsyncContent'
import { LoadingSpinner } from './shared/LoadingSpinner'
import { ErrorMessage } from './shared/ErrorMessage'
import { createError, ErrorType } from '../utils/errorHandling'

// Mock API functions for demonstration
const mockApiSuccess = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return 'Success!'
}

const mockApiNetworkError = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  throw createError(ErrorType.NETWORK, 'Network connection failed')
}

const mockApiServerError = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  throw createError(ErrorType.SERVER, 'Internal server error')
}

const mockApiValidationError = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  throw createError(ErrorType.VALIDATION, 'Validation failed', {
    email: ['Email is required'],
    password: ['Password must be at least 8 characters']
  })
}

const mockApiTimeout = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  throw createError(ErrorType.TIMEOUT, 'Request timed out')
}

const mockListData = async (): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return ['Item 1', 'Item 2', 'Item 3']
}

const mockListError = async (): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  throw createError(ErrorType.SERVER, 'Failed to load list data')
}

export const ErrorHandlingDemo: React.FC = () => {
  const [testType, setTestType] = useState<string>('')
  const { showSuccess, showError, showWarning, showInfo } = useNotifications()
  const { handleError } = useErrorHandler()

  // API hooks for different scenarios
  const successApi = useApi(mockApiSuccess, {
    onSuccess: () => showSuccess('Operation completed successfully!'),
    onError: (error) => console.log('Success API error:', error)
  })

  const networkErrorApi = useApi(mockApiNetworkError, {
    retryAttempts: 2,
    retryDelay: 1000
  })

  const serverErrorApi = useApi(mockApiServerError)
  const validationErrorApi = useApi(mockApiValidationError)
  const timeoutApi = useApi(mockApiTimeout)

  const listSuccessApi = useApi(mockListData)
  const listErrorApi = useApi(mockListError)

  const handleManualError = (type: ErrorType) => {
    const error = createError(type, `Manual ${type.toLowerCase()} error for testing`)
    handleError(error, 'Manual test')
  }

  const handleNotificationTest = (type: 'success' | 'error' | 'warning' | 'info') => {
    const message = `This is a ${type} notification for testing`
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Test`
    
    switch (type) {
      case 'success':
        showSuccess(message, title)
        break
      case 'error':
        showError(message, title)
        break
      case 'warning':
        showWarning(message, title)
        break
      case 'info':
        showInfo(message, title)
        break
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Error Handling Demo</h2>
        
        {/* API Error Testing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">API Error Testing</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => successApi.execute()}
              disabled={successApi.loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {successApi.loading ? 'Loading...' : 'Test Success'}
            </button>
            
            <button
              onClick={() => networkErrorApi.execute()}
              disabled={networkErrorApi.loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {networkErrorApi.loading ? 'Loading...' : 'Test Network Error'}
            </button>
            
            <button
              onClick={() => serverErrorApi.execute()}
              disabled={serverErrorApi.loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {serverErrorApi.loading ? 'Loading...' : 'Test Server Error'}
            </button>
            
            <button
              onClick={() => validationErrorApi.execute()}
              disabled={validationErrorApi.loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {validationErrorApi.loading ? 'Loading...' : 'Test Validation Error'}
            </button>
            
            <button
              onClick={() => timeoutApi.execute()}
              disabled={timeoutApi.loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {timeoutApi.loading ? 'Loading...' : 'Test Timeout'}
            </button>
            
            <button
              onClick={() => networkErrorApi.retry()}
              disabled={!networkErrorApi.error || networkErrorApi.loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Retry Network
            </button>
          </div>

          {/* Display API results */}
          <div className="space-y-2">
            {successApi.error && (
              <ErrorMessage
                type="error"
                message={successApi.error.message}
                onRetry={() => successApi.retry()}
              />
            )}
            
            {networkErrorApi.error && (
              <ErrorMessage
                type="error"
                title="Network Error"
                message={networkErrorApi.error.message}
                onRetry={() => networkErrorApi.retry()}
              />
            )}
            
            {serverErrorApi.error && (
              <ErrorMessage
                type="error"
                title="Server Error"
                message={serverErrorApi.error.message}
                onRetry={() => serverErrorApi.retry()}
              />
            )}
            
            {validationErrorApi.error && (
              <ErrorMessage
                type="warning"
                title="Validation Error"
                message={validationErrorApi.error.message}
              />
            )}
            
            {timeoutApi.error && (
              <ErrorMessage
                type="error"
                title="Timeout Error"
                message={timeoutApi.error.message}
                onRetry={() => timeoutApi.retry()}
              />
            )}
          </div>
        </div>

        {/* Notification Testing */}
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-lg font-semibold text-gray-800">Notification Testing</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleNotificationTest('success')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Success Notification
            </button>
            
            <button
              onClick={() => handleNotificationTest('error')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Error Notification
            </button>
            
            <button
              onClick={() => handleNotificationTest('warning')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Warning Notification
            </button>
            
            <button
              onClick={() => handleNotificationTest('info')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Info Notification
            </button>
          </div>
        </div>

        {/* Manual Error Testing */}
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-lg font-semibold text-gray-800">Manual Error Testing</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleManualError(ErrorType.NETWORK)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Network Error
            </button>
            
            <button
              onClick={() => handleManualError(ErrorType.AUTHENTICATION)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Auth Error
            </button>
            
            <button
              onClick={() => handleManualError(ErrorType.AUTHORIZATION)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Permission Error
            </button>
            
            <button
              onClick={() => handleManualError(ErrorType.NOT_FOUND)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Not Found Error
            </button>
            
            <button
              onClick={() => handleManualError(ErrorType.VALIDATION)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Validation Error
            </button>
            
            <button
              onClick={() => handleManualError(ErrorType.SERVER)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Server Error
            </button>
          </div>
        </div>

        {/* AsyncContent Testing */}
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-lg font-semibold text-gray-800">AsyncContent Testing</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => listSuccessApi.execute()}
              disabled={listSuccessApi.loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Load List (Success)
            </button>
            
            <button
              onClick={() => listErrorApi.execute()}
              disabled={listErrorApi.loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Load List (Error)
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">AsyncList Component:</h4>
            <AsyncList
              loading={listSuccessApi.loading}
              error={listSuccessApi.error}
              data={listSuccessApi.data}
              renderItem={(item, index) => (
                <div className="p-2 bg-gray-100 rounded">
                  {item}
                </div>
              )}
              emptyMessage="No items to display"
              onRetry={() => listSuccessApi.retry()}
            />
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">AsyncList with Error:</h4>
            <AsyncList
              loading={listErrorApi.loading}
              error={listErrorApi.error}
              data={listErrorApi.data}
              renderItem={(item, index) => (
                <div className="p-2 bg-gray-100 rounded">
                  {item}
                </div>
              )}
              emptyMessage="No items to display"
              onRetry={() => listErrorApi.retry()}
            />
          </div>
        </div>

        {/* Loading States */}
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-lg font-semibold text-gray-800">Loading States</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Small Spinner</h4>
              <LoadingSpinner size="sm" />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Medium Spinner</h4>
              <LoadingSpinner size="md" />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Large Spinner</h4>
              <LoadingSpinner size="lg" />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">With Text</h4>
              <LoadingSpinner text="Loading..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}