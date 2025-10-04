import React, { useState } from 'react'
import { User, UserRole } from '../types'
import { userService } from '../services/userService'
import useApi from '../hooks/useApi'

interface RoleManagerAssignmentProps {
  user: User
  users: User[]
  onUpdate: () => void
}

const RoleManagerAssignment: React.FC<RoleManagerAssignmentProps> = ({ 
  user, 
  users, 
  onUpdate 
}) => {
  const [isEditingRole, setIsEditingRole] = useState(false)
  const [isEditingManager, setIsEditingManager] = useState(false)
  const [selectedRole, setSelectedRole] = useState(user.role)
  const [selectedManagerId, setSelectedManagerId] = useState(user.managerId || '')

  const {
    loading: changingRole,
    error: roleError,
    execute: changeRole
  } = useApi(userService.changeUserRole.bind(userService))

  const {
    loading: assigningManager,
    error: managerError,
    execute: assignManager
  } = useApi(userService.assignManager.bind(userService))

  // Get available managers (users with MANAGER or ADMIN role, excluding current user)
  const availableManagers = users.filter(u => 
    (u.role === UserRole.MANAGER || u.role === UserRole.ADMIN) && 
    u.id !== user.id
  )

  const handleRoleChange = async () => {
    if (selectedRole === user.role) {
      setIsEditingRole(false)
      return
    }

    const result = await changeRole(user.id, selectedRole)
    if (result) {
      setIsEditingRole(false)
      onUpdate()
    }
  }

  const handleManagerAssignment = async () => {
    if (selectedManagerId === (user.managerId || '')) {
      setIsEditingManager(false)
      return
    }

    if (selectedManagerId) {
      const result = await assignManager(user.id, selectedManagerId)
      if (result !== null) {
        setIsEditingManager(false)
        onUpdate()
      }
    } else {
      // Handle removing manager assignment
      // Note: The API might need to support this case
      setIsEditingManager(false)
    }
  }

  const cancelRoleEdit = () => {
    setSelectedRole(user.role)
    setIsEditingRole(false)
  }

  const cancelManagerEdit = () => {
    setSelectedManagerId(user.managerId || '')
    setIsEditingManager(false)
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
    <div className="space-y-4">
      {/* Role Assignment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role Assignment
        </label>
        {isEditingRole ? (
          <div className="flex items-center space-x-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={changingRole}
            >
              <option value={UserRole.EMPLOYEE}>Employee</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
            <button
              onClick={handleRoleChange}
              disabled={changingRole}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {changingRole ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelRoleEdit}
              disabled={changingRole}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
            <button
              onClick={() => setIsEditingRole(true)}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Change Role
            </button>
          </div>
        )}
        {roleError && (
          <p className="mt-1 text-sm text-red-600">{roleError}</p>
        )}
      </div>

      {/* Manager Assignment - only show for non-admin roles */}
      {user.role !== UserRole.ADMIN && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Manager Assignment
          </label>
          {isEditingManager ? (
            <div className="flex items-center space-x-2">
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="block w-60 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={assigningManager}
              >
                <option value="">No manager assigned</option>
                {availableManagers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName} ({manager.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleManagerAssignment}
                disabled={assigningManager}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {assigningManager ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelManagerEdit}
                disabled={assigningManager}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900">
                {getManagerName(user.managerId)}
              </span>
              <button
                onClick={() => setIsEditingManager(true)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {user.managerId ? 'Change Manager' : 'Assign Manager'}
              </button>
            </div>
          )}
          {managerError && (
            <p className="mt-1 text-sm text-red-600">{managerError}</p>
          )}
        </div>
      )}

      {/* Manager Approver Setting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Manager Approval Setting
        </label>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            user.isManagerApprover ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {user.isManagerApprover ? 'Manager approves first' : 'Standard approval flow'}
          </span>
          <span className="text-xs text-gray-500">
            (Configure in user edit form)
          </span>
        </div>
      </div>
    </div>
  )
}

export default RoleManagerAssignment