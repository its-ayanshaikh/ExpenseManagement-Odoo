import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import useApi from '../hooks/useApi'
import { userService } from '../services/userService'
import { User, UserRole } from '../types'
import { canManageUsers } from '../utils/permissions'
import { UserForm, RoleManagerAssignment } from '../components'

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)

  const {
    data: fetchedUsers,
    loading: loadingUsers,
    error: usersError,
    execute: fetchUsers
  } = useApi(userService.getUsers.bind(userService))

  const {
    loading: deletingUser,
    error: deleteError,
    execute: deleteUser
  } = useApi(userService.deleteUser.bind(userService))

  // Check if current user has permission to manage users
  if (!canManageUsers(currentUser)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage users.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (fetchedUsers) {
      setUsers(fetchedUsers)
    }
  }, [fetchedUsers])

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const result = await deleteUser(userId)
      if (result !== null) {
        // Refresh users list after successful deletion
        fetchUsers()
      }
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowCreateForm(true)
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    setShowCreateForm(true)
  }

  const handleFormClose = () => {
    setShowCreateForm(false)
    setEditingUser(null)
    // Refresh users list when form closes (in case of updates)
    fetchUsers()
  }

  const handleViewUser = (user: User) => {
    setViewingUser(user)
  }

  const handleCloseUserView = () => {
    setViewingUser(null)
    // Refresh users list when view closes (in case of updates)
    fetchUsers()
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800'
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800'
      case UserRole.EMPLOYEE:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'None'
    const manager = users.find(u => u.id === managerId)
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                User Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {currentUser?.firstName} {currentUser?.lastName}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {currentUser?.role}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Create User button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Company Users</h2>
            <button
              onClick={handleCreateUser}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create User
            </button>
          </div>

          {/* Error Messages */}
          {usersError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">Error loading users: {usersError}</p>
            </div>
          )}

          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">Error deleting user: {deleteError}</p>
            </div>
          )}

          {/* Loading State */}
          {loadingUsers && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          {!loadingUsers && users.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager Approver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getManagerName(user.managerId)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isManagerApprover ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {user.isManagerApprover ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUser}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deletingUser ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loadingUsers && users.length === 0 && !usersError && (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-4">No users found in your company.</p>
              <button
                onClick={handleCreateUser}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create First User
              </button>
            </div>
          )}
        </div>
      </main>

      {/* User Form Modal */}
      {showCreateForm && (
        <UserForm
          user={editingUser}
          users={users}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {/* User Detail View Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  User Details: {viewingUser.firstName} {viewingUser.lastName}
                </h3>
                <button
                  onClick={handleCloseUserView}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{viewingUser.firstName} {viewingUser.lastName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-gray-900">{viewingUser.email}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">User ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-xs">{viewingUser.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="ml-2 text-gray-900">{new Date(viewingUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Current Settings */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Current Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Role:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(viewingUser.role)}`}>
                        {viewingUser.role}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Manager:</span>
                      <span className="ml-2 text-gray-900">{getManagerName(viewingUser.managerId)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Manager Approver:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${viewingUser.isManagerApprover ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {viewingUser.isManagerApprover ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role and Manager Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Role & Manager Assignment</h4>
                <RoleManagerAssignment
                  user={viewingUser}
                  users={users}
                  onUpdate={() => {
                    // Update the viewing user data and refresh the list
                    const updatedUser = users.find(u => u.id === viewingUser.id)
                    if (updatedUser) {
                      setViewingUser(updatedUser)
                    }
                    fetchUsers()
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => {
                    handleCloseUserView()
                    handleEditUser(viewingUser)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit User
                </button>
                <button
                  onClick={handleCloseUserView}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagementPage