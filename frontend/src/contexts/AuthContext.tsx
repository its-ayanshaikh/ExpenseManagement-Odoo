import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Company, AuthResponse, LoginCredentials, SignupData } from '../types'
import { authService } from '../services/authService'
import useLocalStorage from '../hooks/useLocalStorage'

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
  
  // Use localStorage hooks for token management
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('accessToken', null)
  const [refreshToken, setRefreshToken] = useLocalStorage<string | null>('refreshToken', null)

  const isAuthenticated = !!user && !!accessToken

  // Clear error helper
  const clearError = () => setError(null)

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: AuthResponse = await authService.login(credentials)
      
      // Store tokens
      setAccessToken(response.accessToken)
      setRefreshToken(response.refreshToken)
      
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
      
      // Store tokens
      setAccessToken(response.accessToken)
      setRefreshToken(response.refreshToken)
      
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
      setAccessToken(null)
      setRefreshToken(null)
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
      // If refresh fails due to invalid token, logout
      if (err.response?.status === 401) {
        await logout()
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken) {
        try {
          // Try to get current user data
          const userData = await authService.getCurrentUser()
          setUser(userData)
          
          // Note: We don't have a separate company endpoint, 
          // so we'll need to get company data from user or another source
          // For now, we'll leave company as null and handle it when needed
        } catch (err: any) {
          console.error('Failed to initialize auth:', err)
          // If token is invalid, clear it
          if (err.response?.status === 401) {
            setAccessToken(null)
            setRefreshToken(null)
          }
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [accessToken, setAccessToken, setRefreshToken])

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!accessToken || !refreshToken) return

    // JWT tokens typically expire in 15 minutes (900 seconds)
    // Refresh 2 minutes before expiration (780 seconds)
    const refreshInterval = setInterval(async () => {
      try {
        const response = await authService.refreshToken(refreshToken)
        setAccessToken(response.accessToken)
      } catch (err) {
        console.error('Token refresh failed:', err)
        // If refresh fails, logout user
        await logout()
      }
    }, 13 * 60 * 1000) // 13 minutes

    return () => clearInterval(refreshInterval)
  }, [accessToken, refreshToken, setAccessToken])

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