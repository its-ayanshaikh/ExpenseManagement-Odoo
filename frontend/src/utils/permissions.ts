import { User, UserRole } from '../types'

/**
 * Utility functions for role-based permission checking
 * Based on Requirement 7: Role-Based Permissions
 */

// Check if user has admin role (Requirement 7.1)
export const isAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN
}

// Check if user has manager role (Requirement 7.2)
export const isManager = (user: User | null): boolean => {
  return user?.role === UserRole.MANAGER
}

// Check if user has employee role (Requirement 7.3)
export const isEmployee = (user: User | null): boolean => {
  return user?.role === UserRole.EMPLOYEE
}

// Check if user has manager privileges (Admin or Manager) (Requirements 7.1, 7.2)
export const hasManagerPrivileges = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER
}

// Check if user has specific role
export const hasRole = (user: User | null, role: UserRole): boolean => {
  return user?.role === role
}

// Check if user has any of the specified roles
export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  return user ? roles.includes(user.role) : false
}

/**
 * Admin-specific permissions (Requirement 7.1)
 * Admin SHALL allow: creating companies, managing users, setting roles, 
 * configuring approval rules, viewing all expenses, and overriding approvals
 */
export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user)
}

export const canSetRoles = (user: User | null): boolean => {
  return isAdmin(user)
}

export const canConfigureApprovalRules = (user: User | null): boolean => {
  return isAdmin(user)
}

export const canViewAllExpenses = (user: User | null): boolean => {
  return isAdmin(user)
}

export const canOverrideApprovals = (user: User | null): boolean => {
  return isAdmin(user)
}

export const canCreateCompanies = (user: User | null): boolean => {
  return isAdmin(user)
}

/**
 * Manager-specific permissions (Requirement 7.2)
 * Manager SHALL allow: approving/rejecting expenses, viewing team expenses, and escalating per rules
 */
export const canApproveRejectExpenses = (user: User | null): boolean => {
  return hasManagerPrivileges(user)
}

export const canViewTeamExpenses = (user: User | null): boolean => {
  return hasManagerPrivileges(user)
}

export const canEscalateExpenses = (user: User | null): boolean => {
  return hasManagerPrivileges(user)
}

/**
 * Employee-specific permissions (Requirement 7.3)
 * Employee SHALL allow: submitting expenses, viewing own expenses, and checking approval status
 */
export const canSubmitExpenses = (user: User | null): boolean => {
  // All roles can submit expenses, but this is the primary Employee function
  return !!user
}

export const canViewOwnExpenses = (user: User | null): boolean => {
  // All authenticated users can view their own expenses
  return !!user
}

export const canCheckApprovalStatus = (user: User | null): boolean => {
  // All authenticated users can check approval status of their expenses
  return !!user
}

/**
 * Permission validation for route protection
 */
export interface PermissionCheck {
  adminOnly?: boolean
  managerOrAdmin?: boolean
  employeeOnly?: boolean
  requiredRole?: UserRole | UserRole[]
  requireAnyRole?: boolean
  customCheck?: (user: User | null) => boolean
}

export const hasPermission = (user: User | null, check: PermissionCheck): boolean => {
  // Custom permission check
  if (check.customCheck) {
    return check.customCheck(user)
  }

  // Admin-only check
  if (check.adminOnly) {
    return isAdmin(user)
  }

  // Manager or Admin check
  if (check.managerOrAdmin) {
    return hasManagerPrivileges(user)
  }

  // Employee-only check
  if (check.employeeOnly) {
    return isEmployee(user)
  }

  // Specific role requirements
  if (check.requiredRole) {
    if (Array.isArray(check.requiredRole)) {
      if (check.requireAnyRole) {
        return hasAnyRole(user, check.requiredRole)
      } else {
        // All roles required (not practical, but included for completeness)
        return check.requiredRole.every(role => hasRole(user, role))
      }
    } else {
      return hasRole(user, check.requiredRole)
    }
  }

  // Default: allow access for authenticated users
  return !!user
}

/**
 * Get user-friendly permission description for error messages
 */
export const getPermissionDescription = (check: PermissionCheck): string => {
  if (check.adminOnly) return 'Admin'
  if (check.managerOrAdmin) return 'Manager or Admin'
  if (check.employeeOnly) return 'Employee'
  
  if (check.requiredRole) {
    if (Array.isArray(check.requiredRole)) {
      return check.requireAnyRole 
        ? check.requiredRole.join(' or ')
        : check.requiredRole.join(' and ')
    }
    return check.requiredRole
  }
  
  if (check.customCheck) return 'Special permissions'
  
  return 'Authenticated user'
}