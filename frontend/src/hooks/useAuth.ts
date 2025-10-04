import { useAuth as useAuthContext } from '../contexts/AuthContext'
import { UserRole } from '../types'

// Re-export the useAuth hook for convenience
export const useAuth = useAuthContext

// Additional auth-related hooks can be added here

// Hook to check if user has specific role
export const useHasRole = (role: UserRole) => {
  const { user } = useAuth()
  return user?.role === role
}

// Hook to check if user has any of the specified roles
export const useHasAnyRole = (roles: UserRole[]) => {
  const { user } = useAuth()
  return user ? roles.includes(user.role) : false
}

// Hook to check if user is admin (Requirement 7.1)
export const useIsAdmin = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN
}

// Hook to check if user is manager (Requirement 7.2)
export const useIsManager = () => {
  const { user } = useAuth()
  return user?.role === UserRole.MANAGER
}

// Hook to check if user is employee (Requirement 7.3)
export const useIsEmployee = () => {
  const { user } = useAuth()
  return user?.role === UserRole.EMPLOYEE
}

// Hook to check if user has manager privileges (Admin or Manager) (Requirements 7.1, 7.2)
export const useHasManagerPrivileges = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER
}

// Hook to check if user can manage users (Admin only) (Requirement 7.1)
export const useCanManageUsers = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN
}

// Hook to check if user can configure approval rules (Admin only) (Requirement 7.1)
export const useCanConfigureApprovalRules = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN
}

// Hook to check if user can view all expenses (Admin only) (Requirement 7.1)
export const useCanViewAllExpenses = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN
}

// Hook to check if user can override approvals (Admin only) (Requirement 7.1)
export const useCanOverrideApprovals = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN
}

// Hook to check if user can approve/reject expenses (Manager or Admin) (Requirements 7.1, 7.2)
export const useCanApproveExpenses = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER
}

// Hook to check if user can view team expenses (Manager or Admin) (Requirements 7.1, 7.2)
export const useCanViewTeamExpenses = () => {
  const { user } = useAuth()
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER
}

// Hook to check if user can submit expenses (Employee, Manager, or Admin) (Requirements 7.1, 7.2, 7.3)
export const useCanSubmitExpenses = () => {
  const { user } = useAuth()
  return user?.role === UserRole.EMPLOYEE || user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN
}

// Hook to check if user can view own expenses (All roles) (Requirements 7.1, 7.2, 7.3)
export const useCanViewOwnExpenses = () => {
  const { user } = useAuth()
  return !!user // All authenticated users can view their own expenses
}