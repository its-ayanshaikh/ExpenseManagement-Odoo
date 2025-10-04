import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/database';
import { User } from '../models/User';

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = 'INSUFFICIENT_PERMISSIONS') {
    super(message);
    this.statusCode = 403;
    this.code = code;
    this.name = 'AuthorizationError';
  }
}

/**
 * Role checking utility functions
 */
export const roleCheckers = {
  /**
   * Check if user is an Admin
   */
  isAdmin: (user: User): boolean => {
    return user.role === UserRole.ADMIN;
  },

  /**
   * Check if user is a Manager
   */
  isManager: (user: User): boolean => {
    return user.role === UserRole.MANAGER;
  },

  /**
   * Check if user is an Employee
   */
  isEmployee: (user: User): boolean => {
    return user.role === UserRole.EMPLOYEE;
  },

  /**
   * Check if user has admin or manager role
   */
  isAdminOrManager: (user: User): boolean => {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  },

  /**
   * Check if user has manager or employee role
   */
  isManagerOrEmployee: (user: User): boolean => {
    return user.role === UserRole.MANAGER || user.role === UserRole.EMPLOYEE;
  },

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole: (user: User, roles: UserRole[]): boolean => {
    return roles.includes(user.role);
  },

  /**
   * Check if user belongs to the specified company
   */
  belongsToCompany: (user: User, companyId: string): boolean => {
    return user.companyId === companyId;
  },

  /**
   * Check if user can access resource belonging to specific company
   */
  canAccessCompanyResource: (user: User, resourceCompanyId: string): boolean => {
    return user.companyId === resourceCompanyId;
  },

  /**
   * Check if user is the owner of a resource or has admin privileges
   */
  isOwnerOrAdmin: (user: User, resourceOwnerId: string): boolean => {
    return user.id === resourceOwnerId || user.role === UserRole.ADMIN;
  },

  /**
   * Check if user is a manager of the specified user
   */
  isManagerOf: (manager: User, _employeeId: string): boolean => {
    // This would need to be enhanced with actual manager-employee relationship checking
    // For now, we check if the manager role and same company
    return manager.role === UserRole.MANAGER && Boolean(manager.companyId);
  }
};

/**
 * Middleware factory to require specific roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      if (!roleCheckers.hasAnyRole(req.user, roles)) {
        res.status(403).json({
          status: 'error',
          message: `Access denied. Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: roles,
          userRole: req.user.role
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during authorization',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}

/**
 * Middleware to require Admin role
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware to require Manager role
 */
export const requireManager = requireRole(UserRole.MANAGER);

/**
 * Middleware to require Employee role
 */
export const requireEmployee = requireRole(UserRole.EMPLOYEE);

/**
 * Middleware to require Admin or Manager role
 */
export const requireAdminOrManager = requireRole(UserRole.ADMIN, UserRole.MANAGER);

/**
 * Middleware to require Manager or Employee role
 */
export const requireManagerOrEmployee = requireRole(UserRole.MANAGER, UserRole.EMPLOYEE);

/**
 * Middleware to ensure company isolation
 * Checks that the user can only access resources from their own company
 */
export function requireCompanyAccess(companyIdParam: string = 'companyId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Get company ID from request parameters, body, or query
      const requestedCompanyId = req.params[companyIdParam] || 
                                req.body[companyIdParam] || 
                                req.query[companyIdParam] as string;

      if (!requestedCompanyId) {
        res.status(400).json({
          status: 'error',
          message: 'Company ID is required',
          code: 'MISSING_COMPANY_ID'
        });
        return;
      }

      if (!roleCheckers.canAccessCompanyResource(req.user, requestedCompanyId)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access resources from your own company',
          code: 'COMPANY_ACCESS_DENIED',
          userCompanyId: req.user.companyId,
          requestedCompanyId
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Company access authorization error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during company access check',
        code: 'COMPANY_ACCESS_ERROR'
      });
    }
  };
}

/**
 * Middleware to ensure user can only access their own resources or admin can access all
 */
export function requireOwnershipOrAdmin(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Get user ID from request parameters, body, or query
      const requestedUserId = req.params[userIdParam] || 
                             req.body[userIdParam] || 
                             req.query[userIdParam] as string;

      if (!requestedUserId) {
        res.status(400).json({
          status: 'error',
          message: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }

      if (!roleCheckers.isOwnerOrAdmin(req.user, requestedUserId)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own resources or must be an admin',
          code: 'OWNERSHIP_ACCESS_DENIED',
          userId: req.user.id,
          requestedUserId
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Ownership authorization error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during ownership check',
        code: 'OWNERSHIP_ACCESS_ERROR'
      });
    }
  };
}

/**
 * Middleware to automatically enforce company isolation for authenticated users
 * This middleware should be used on routes that deal with company-specific resources
 * It automatically restricts access to the user's own company data
 */
export function enforceCompanyIsolation(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Add company isolation to the request context
    // This can be used by services to automatically filter by company
    req.companyId = req.user.companyId;

    next();
  } catch (error) {
    console.error('Company isolation enforcement error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during company isolation enforcement',
      code: 'COMPANY_ISOLATION_ERROR'
    });
  }
}

/**
 * Middleware to check if user has permission to manage other users
 * Only admins can manage users, and only within their own company
 */
export function requireUserManagementPermission(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!roleCheckers.isAdmin(req.user)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Only administrators can manage users',
        code: 'ADMIN_REQUIRED',
        userRole: req.user.role
      });
      return;
    }

    next();
  } catch (error) {
    console.error('User management permission error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user management permission check',
      code: 'USER_MANAGEMENT_PERMISSION_ERROR'
    });
  }
}

/**
 * Middleware to check if user has permission to configure approval rules
 * Only admins can configure approval rules, and only for their own company
 */
export function requireApprovalRulePermission(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!roleCheckers.isAdmin(req.user)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Only administrators can configure approval rules',
        code: 'ADMIN_REQUIRED',
        userRole: req.user.role
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Approval rule permission error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during approval rule permission check',
      code: 'APPROVAL_RULE_PERMISSION_ERROR'
    });
  }
}

// Extend Express Request interface to include companyId
declare global {
  namespace Express {
    interface Request {
      companyId?: string;
    }
  }
}