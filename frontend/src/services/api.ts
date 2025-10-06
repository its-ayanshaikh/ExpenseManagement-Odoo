import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { parseApiError, logError, AppError } from '../utils/errorHandling'
import { config, isDevelopment } from '../config/environment'

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000, // Increased timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and handle request errors
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request timestamp for timeout tracking
    ; (config as any).metadata = { startTime: new Date() }

    return config
  },
  (error) => {
    logError(error, 'Request interceptor')
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh and errors
apiClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    // Log response time in development
    if (isDevelopment() && (response.config as any).metadata?.startTime) {
      const duration = new Date().getTime() - (response.config as any).metadata.startTime.getTime()
      const { logger } = await import('../utils/logger')
      logger.api(
        response.config.method?.toUpperCase() || 'UNKNOWN',
        response.config.url || '',
        duration,
        response.status
      )
    }

    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config

    // Log error details
    logError(error, `API ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`)

    // Handle 401 errors (token expired) - but ONLY for authentication endpoints
    // For other endpoints, let the error propagate without auto-logout
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/')

      // Only attempt token refresh if we have a refresh token and it's not already a refresh request
      if (!isAuthEndpoint && !originalRequest.url?.includes('/auth/refresh')) {
        (originalRequest as any)._retry = true

        try {
          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken) {
            const response = await axios.post(`${config.apiBaseUrl}/auth/refresh`, {
              refreshToken,
            })

            const { accessToken, refreshToken: newRefreshToken } = response.data.data
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', newRefreshToken)

            // Retry original request with new token
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return apiClient(originalRequest)
          }
        } catch (refreshError: any) {
          // If refresh fails with 401, it means the refresh token is invalid
          // In this case, just let the error propagate - don't force logout here
          // The AuthContext will handle logout when appropriate
          console.error('Token refresh failed:', refreshError)
        }
      }
    }

    // Parse and enhance the error
    const appError = parseApiError(error)
    return Promise.reject(appError)
  }
)

// API client wrapper with typed methods and enhanced error handling
export class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = apiClient
  }

  // Generic GET request with error handling
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.get<T>(url, config)
      return response.data
    } catch (error) {
      throw this.handleError(error, 'GET', url)
    }
  }

  // Generic POST request with error handling
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data, config)
      return response.data
    } catch (error) {
      throw this.handleError(error, 'POST', url)
    }
  }

  // Generic PUT request with error handling
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data, config)
      return response.data
    } catch (error) {
      throw this.handleError(error, 'PUT', url)
    }
  }

  // Generic DELETE request with error handling
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.delete<T>(url, config)
      return response.data
    } catch (error) {
      throw this.handleError(error, 'DELETE', url)
    }
  }

  // File upload request with progress tracking
  async uploadFile<T>(
    url: string,
    file: File,
    config?: AxiosRequestConfig & {
      onUploadProgress?: (progressEvent: any) => void
    }
  ): Promise<T> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await this.client.post<T>(url, formData, {
        ...config,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...config?.headers,
        },
        timeout: 60000, // Longer timeout for file uploads
      })
      return response.data
    } catch (error) {
      throw this.handleError(error, 'POST', url)
    }
  }

  // Batch request handler
  async batch<T>(requests: Array<() => Promise<any>>): Promise<T[]> {
    try {
      const results = await Promise.allSettled(requests.map(req => req()))

      const errors: AppError[] = []
      const data: T[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          data[index] = result.value
        } else {
          errors.push(parseApiError(result.reason))
        }
      })

      if (errors.length > 0) {
        // If any requests failed, throw the first error
        throw errors[0]
      }

      return data
    } catch (error) {
      throw this.handleError(error, 'BATCH', 'multiple endpoints')
    }
  }

  // Enhanced error handling
  private async handleError(error: unknown, method: string, url: string): Promise<AppError> {
    const appError = parseApiError(error)

    // Add context information
    const enhancedError: AppError = {
      ...appError,
      details: appError.details || `${method} ${url}`,
    }

    // Log error
    if (isDevelopment()) {
      const { logger } = await import('../utils/logger')
      logger.error(`API Error [${method} ${url}]`, enhancedError)
    }

    return enhancedError
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health')
  }

  // Get API client instance for direct use
  getClient(): AxiosInstance {
    return this.client
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export axios instance for direct use if needed
export { apiClient }