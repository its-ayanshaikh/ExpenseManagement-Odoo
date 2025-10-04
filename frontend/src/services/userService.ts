import { api } from './api'
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types'

export class UserService {
  // Create new user (Admin only)
  async createUser(userData: CreateUserDTO): Promise<User> {
    return api.post<User>('/users', userData)
  }

  // Get all users in company (Admin only)
  async getUsers(): Promise<User[]> {
    return api.get<User[]>('/users')
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    return api.get<User>(`/users/${id}`)
  }

  // Update user (Admin only)
  async updateUser(id: string, userData: UpdateUserDTO): Promise<User> {
    return api.put<User>(`/users/${id}`, userData)
  }

  // Delete user (Admin only)
  async deleteUser(id: string): Promise<void> {
    return api.delete<void>(`/users/${id}`)
  }

  // Change user role (Admin only)
  async changeUserRole(id: string, role: UserRole): Promise<User> {
    return api.put<User>(`/users/${id}/role`, { role })
  }

  // Assign manager to user (Admin only)
  async assignManager(id: string, managerId: string): Promise<void> {
    return api.put<void>(`/users/${id}/manager`, { managerId })
  }
}

export const userService = new UserService()