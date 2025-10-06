import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Company, AuthResponse, LoginCredentials, SignupData } from '../types'
import { authService } from '../services/authService'

interface AuthState {
  user: User | null
  company: Company | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (signupData: SignupData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Check authentication status
  // Note: We check localStorage directly to avoid stale state
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const isAuthenticated = !!user && !!accessToken

  // Clear error helper
  const clearError = () => setError(null)

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: AuthResponse = await authService.login(credentials)
      
      // Store tokens directly in localStorage (no JSON.stringify to avoid quotes)
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      
      // Set user and company data
      setUser(response.user)
      setCompany(response.company)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Signup function
  const signup = async (signupData: SignupData): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: AuthResponse = await authService.signup(signupData)
      
      // Store tokens directly in localStorage (no JSON.stringify to avoid quotes)
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      
      // Set user and company data
      setUser(response.user)
      setCompany(response.company)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Signup failed. Please try again.'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true)
      
      // Call logout API if we have a token
      if (accessToken) {
        await authService.logout()
      }
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', err)
    } finally {
      // Clear all auth data
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      setCompany(null)
      setError(null)
      setIsLoading(false)
    }
  }

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      if (!accessToken) return
      
      setIsLoading(true)
      const userData = await authService.getCurrentUser()
      setUser(userData)
    } catch (err: any) {
      console.error('Failed to refresh user data:', err)
      // Don't auto-logout on refresh user errors
      // Let the user stay logged in and see the error
      // They can manually logout if needed
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken')
      
      // Only try to fetch user if we have a token and no user data yet
      if (storedToken && !user) {
        try {
          // Try to get current user data
          const userData = await authService.getCurrentUser()
          setUser(userData)
          
          // Note: We don't have a separate company endpoint, 
          // so we'll need to get company data from user or another source
          // For now, we'll leave company as null and handle it when needed
        } catch (err: any) {
          console.error('Failed to initialize auth:', err)
          // Only clear tokens if it's a 401 error (invalid token)
          // For network errors or other issues, keep the user logged in
          if (err?.response?.status === 401 || err?.statusCode === 401 || err?.type === 'AUTHENTICATION') {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            setUser(null)
            setCompany(null)
          }
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh token before expiration
  useEffect(() => {
    // Only set up refresh if we have both tokens
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    
    if (!storedAccessToken || !storedRefreshToken) return

    // JWT tokens typically expire in 15 minutes (900 seconds)
    // Refresh 2 minutes before expiration (780 seconds)
    const refreshInterval = setInterval(async () => {
      try {
        const currentRefreshToken = localStorage.getItem('refreshToken')
        if (!currentRefreshToken) {
          clearInterval(refreshInterval)
          return
        }
        
        const response = await authService.refreshToken(currentRefreshToken)
        localStorage.setItem('accessToken', response.accessToken)
        localStorage.setItem('refreshToken', response.refreshToken)
      } catch (err: any) {
        console.error('Token refresh failed:', err)
        // Only logout if it's a 401 error (invalid refresh token)
        // Don't logout on network errors or other temporary issues
        if (err?.response?.status === 401 || err?.statusCode === 401) {
          clearInterval(refreshInterval)
          await logout()
        }
        // For other errors, keep trying on next interval
      }
    }, 13 * 60 * 1000) // 13 minutes

    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value: AuthContextType = {
    user,
    company,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    refreshUser,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}