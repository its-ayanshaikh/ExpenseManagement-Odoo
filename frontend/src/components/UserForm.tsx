import React, { useState, useEffect } from 'react'
import { User, UserRole, CreateUserDTO, UpdateUserDTO } from '../types'
import { userService } from '../services/userService'
import useApi from '../hooks/useApi'
import { isValidEmail } from '../utils'
import { useNotifications } from '../contexts/NotificationContext'

interface UserFormProps {
  user?: User | null
  users: User[]
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  managerId: string
  isManagerApprover: boolean
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  role?: string
  managerId?: string
}

const UserForm: React.FC<UserFormProps> = ({ user, users, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotifications()
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: UserRole.EMPLOYEE,
    managerId: '',
    isManagerApprover: false
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    loading: creatingUser,
    error: createError,
    execute: createUser
  } = useApi(userService.createUser.bind(userService))

  const {
    loading: updatingUser,
    error: updateError,
    execute: updateUser
  } = useApi(userService.updateUser.bind(userService))

  // Initialize form data when editing
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        managerId: user.managerId || '',
        isManagerApprover: user.isManagerApprover
      })
    }
  }, [user])

  // Get available managers (users with MANAGER or ADMIN role, excluding current user)
  const availableManagers = users.filter(u => 
    (u.role === UserRole.MANAGER || u.role === UserRole.ADMIN) && 
    u.id !== user?.id
  )

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    } else {
      // Check for duplicate email (only when creating or changing email)
      const existingUser = users.find(u => 
        u.email.toLowerCase() === formData.email.toLowerCase() && 
        u.id !== user?.id
      )
      if (existingUser) {
        newErrors.email = 'This email is already in use'
      }
    }

    // Role validation
    if (!Object.values(UserRole).includes(formData.role)) {
      newErrors.role = 'Please select a valid role'
    }

    // Manager validation - only for non-admin roles
    if (formData.role !== UserRole.ADMIN && formData.managerId) {
      const selectedManager = users.find(u => u.id === formData.managerId)
      if (!selectedManager) {
        newErrors.managerId = 'Selected manager not found'
      } else if (selectedManager.role === UserRole.EMPLOYEE) {
        newErrors.managerId = 'Manager must have MANAGER or ADMIN role'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }

    // Clear manager when role is ADMIN
    if (name === 'role' && value === UserRole.ADMIN) {
      setFormData(prev => ({
        ...prev,
        managerId: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (user) {
        // Update existing user
        const updateData: UpdateUserDTO = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          role: formData.role,
          managerId: formData.managerId || undefined,
          isManagerApprover: formData.isManagerApprover
        }

        const result = await updateUser(user.id, updateData)
        if (result) {
          showSuccess('User updated successfully!', 'User Management')
          onSuccess()
        }
      } else {
        // Create new user
        const createData: CreateUserDTO = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          role: formData.role,
          managerId: formData.managerId || undefined,
          isManagerApprover: formData.isManagerApprover
        }

        const result = await createUser(createData)
        if (result) {
          showSuccess('User created successfully!', 'User Management')
          onSuccess()
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      showError('Failed to save user. Please try again.', 'User Management')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = creatingUser || updatingUser || isSubmitting
  const submitError = createError || updateError

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {user ? 'Edit User' : 'Create User'}
          </h3>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-800 text-sm">{String(submitError)}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Email - only show when creating new user */}
            {!user && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            )}

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value={UserRole.EMPLOYEE}>Employee</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            {/* Manager - only show for non-admin roles */}
            {formData.role !== UserRole.ADMIN && (
              <div>
                <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">
                  Manager
                </label>
                <select
                  id="managerId"
                  name="managerId"
                  value={formData.managerId}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.managerId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a manager (optional)</option>
                  {availableManagers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.role})
                    </option>
                  ))}
                </select>
                {errors.managerId && (
                  <p className="mt-1 text-sm text-red-600">{errors.managerId}</p>
                )}
              </div>
            )}

            {/* Manager Approver Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isManagerApprover"
                name="isManagerApprover"
                checked={formData.isManagerApprover}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isManagerApprover" className="ml-2 block text-sm text-gray-900">
                Manager must approve expenses first
              </label>
            </div>
            <p className="text-xs text-gray-500">
              When enabled, expenses will be routed to the assigned manager before other approval rules
            </p>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserForm