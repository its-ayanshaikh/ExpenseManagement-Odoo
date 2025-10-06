import { api } from './api'
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types'

export class UserService {
  // Create new user (Admin only)
  async createUser(userData: CreateUserDTO): Promise<User> {
    const response = await api.post<{
      status: string
      message: string
      data: { user: User }
    }>('/users', userData)
    return response.data.user
  }

  // Get all users in company (Admin only)
  async getUsers(): Promise<User[]> {
    const response = await api.get<{
      status: string
      message: string
      data: { users: User[]; count: number }
    }>('/users')
    return response.data.users
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const response = await api.get<{
      status: string
      message: string
      data: { user: User }
    }>(`/users/${id}`)
    return response.data.user
  }

  // Update user (Admin only)
  async updateUser(id: string, userData: UpdateUserDTO): Promise<User> {
    const response = await api.put<{
      status: string
      message: string
      data: { user: User }
    }>(`/users/${id}`, userData)
    return response.data.user
  }

  // Delete user (Admin only)
  async deleteUser(id: string): Promise<void> {
    await api.delete<{
      status: string
      message: string
    }>(`/users/${id}`)
  }

  // Change user role (Admin only)
  async changeUserRole(id: string, role: UserRole): Promise<User> {
    const response = await api.put<{
      status: string
      message: string
      data: { user: User }
    }>(`/users/${id}/role`, { role })
    return response.data.user
  }

  // Assign manager to user (Admin only)
  async assignManager(id: string, managerId: string): Promise<void> {
    await api.put<{
      status: string
      message: string
    }>(`/users/${id}/manager`, { managerId })
  }
}

export const userService = new UserService()