import { api } from './api'
import { AuthResponse, LoginCredentials, SignupData, User } from '../types'

export class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<{
      status: string
      message: string
      data: {
        user: User
        company: any
        tokens: {
          accessToken: string
          refreshToken: string
        }
      }
    }>('/auth/login', credentials)
    
    // Transform backend response to match frontend AuthResponse interface
    return {
      user: response.data.user,
      company: response.data.company,
      accessToken: response.data.tokens.accessToken,
      refreshToken: response.data.tokens.refreshToken,
    }
  }

  // Signup new user and create company
  async signup(signupData: SignupData): Promise<AuthResponse> {
    const response = await api.post<{
      status: string
      message: string
      data: {
        user: User
        company: any
        tokens: {
          accessToken: string
          refreshToken: string
        }
      }
    }>('/auth/signup', signupData)
    
    // Transform backend response to match frontend AuthResponse interface
    return {
      user: response.data.user,
      company: response.data.company,
      accessToken: response.data.tokens.accessToken,
      refreshToken: response.data.tokens.refreshToken,
    }
  }

  // Logout user
  async logout(): Promise<void> {
    return api.post<void>('/auth/logout')
  }

  // Get current user info
  async getCurrentUser(): Promise<User> {
    const response = await api.get<{
      status: string
      message: string
      data: User
    }>('/auth/me')
    return response.data
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await api.post<{
      status: string
      message: string
      data: {
        accessToken: string
        refreshToken: string
      }
    }>('/auth/refresh', { refreshToken })
    
    return response.data
  }
}

export const authService = new AuthService()