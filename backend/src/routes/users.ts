import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  requireUserManagementPermission,
  enforceCompanyIsolation,
  roleCheckers
} from '../middleware/authorization';
import { UserRole } from '../types/database';
import { UserService } from '../services/UserService';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// Validation interfaces
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  managerId?: string;
  isManagerApprover?: boolean;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  managerId?: string;
  isManagerApprover?: boolean;
}

interface AssignRoleRequest {
  role: UserRole;
}

interface AssignManagerRequest {
  managerId: string;
}

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, managerId, isManagerApprover }: CreateUserRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      res.status(400).json({
        status: 'error',
        message: 'Email, password, firstName, lastName, and role are required',
        code: 'MISSING_FIELDS',
        required: ['email', 'password', 'firstName', 'lastName', 'role']
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid role',
        code: 'INVALID_ROLE',
        validRoles: Object.values(UserRole)
      });
      return;
    }

    // Use UserService to create user
    const user = await UserService.createUser({
      companyId: req.user!.companyId,
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      managerId,
      isManagerApprover
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
          code: 'USER_EXISTS'
        });
        return;
      }
      
      if (error.message.includes('Manager not found') || 
          error.message.includes('Manager must belong') ||
          error.message.includes('Manager must have')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'INVALID_MANAGER'
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user creation',
      code: 'USER_CREATION_ERROR'
    });
  }
});

/**
 * GET /api/users
 * List all users in company (Admin only)
 */
router.get('/', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserService.getUsersByCompany(req.user!.companyId);

    res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      data: {
        users: users.map(user => user.toSafeObject()),
        count: users.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving users',
      code: 'GET_USERS_ERROR'
    });
  }
});

/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await UserService.getUserById(id);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Ensure user belongs to the same company
    if (!roleCheckers.belongsToCompany(user, req.user!.companyId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. User belongs to a different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    // Check if user can access this user's details
    // Admin can access all users, others can only access their own details
    if (!roleCheckers.isAdmin(req.user!) && req.user!.id !== user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own user details',
        code: 'USER_ACCESS_DENIED'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving user',
      code: 'GET_USER_ERROR'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 */
router.put('/:id', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, managerId, isManagerApprover }: UpdateUserRequest = req.body;

    // Check if user exists and belongs to the same company
    const existingUser = await UserService.getUserById(id);
    if (!existingUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Ensure user belongs to the same company
    if (!roleCheckers.belongsToCompany(existingUser, req.user!.companyId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. User belongs to a different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
        return;
      }
    }

    // Validate role if provided
    if (role && !Object.values(UserRole).includes(role)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid role',
        code: 'INVALID_ROLE',
        validRoles: Object.values(UserRole)
      });
      return;
    }

    // Use UserService to update user
    const updatedUser = await UserService.updateUser(id, {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      email: email?.toLowerCase().trim(),
      role,
      managerId,
      isManagerApprover
    });

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('already taken')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
          code: 'EMAIL_TAKEN'
        });
        return;
      }
      
      if (error.message.includes('Manager not found') || 
          error.message.includes('Manager must belong') ||
          error.message.includes('Manager must have') ||
          error.message.includes('cannot be their own manager')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'INVALID_MANAGER'
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user update',
      code: 'USER_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await UserService.getUserById(id);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Ensure user belongs to the same company
    if (!roleCheckers.belongsToCompany(user, req.user!.companyId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. User belongs to a different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user!.id) {
      res.status(400).json({
        status: 'error',
        message: 'You cannot delete your own account',
        code: 'CANNOT_DELETE_SELF'
      });
      return;
    }

    // Use UserService to delete user (includes validation for pending approvals)
    await UserService.deleteUser(id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
      data: {
        deletedUserId: id
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('pending approval') || 
          error.message.includes('pending expense') ||
          error.message.includes('managing other users')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'DELETE_VALIDATION_ERROR'
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user deletion',
      code: 'USER_DELETE_ERROR'
    });
  }
});

/**
 * PUT /api/users/:id/role
 * Change user role (Admin only)
 */
router.put('/:id/role', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role }: AssignRoleRequest = req.body;

    if (!role) {
      res.status(400).json({
        status: 'error',
        message: 'Role is required',
        code: 'MISSING_ROLE'
      });
      return;
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid role',
        code: 'INVALID_ROLE',
        validRoles: Object.values(UserRole)
      });
      return;
    }

    const user = await UserService.getUserById(id);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Ensure user belongs to the same company
    if (!roleCheckers.belongsToCompany(user, req.user!.companyId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. User belongs to a different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    // Use UserService to assign role (includes validation for managing users)
    const updatedUser = await UserService.assignRole(id, role);

    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        user: updatedUser.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('managing other users')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'ROLE_VALIDATION_ERROR'
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during role update',
      code: 'ROLE_UPDATE_ERROR'
    });
  }
});

/**
 * PUT /api/users/:id/manager
 * Assign manager to user (Admin only)
 */
router.put('/:id/manager', requireUserManagementPermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { managerId }: AssignManagerRequest = req.body;

    // Allow null managerId to remove manager
    if (managerId !== null && !managerId) {
      res.status(400).json({
        status: 'error',
        message: 'Manager ID is required (use null to remove manager)',
        code: 'MISSING_MANAGER_ID'
      });
      return;
    }

    const user = await UserService.getUserById(id);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Ensure user belongs to the same company
    if (!roleCheckers.belongsToCompany(user, req.user!.companyId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. User belongs to a different company',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    // Use UserService to assign manager (includes circular relationship validation)
    const updatedUser = await UserService.assignManager(id, managerId);

    res.status(200).json({
      status: 'success',
      message: managerId ? 'Manager assigned successfully' : 'Manager removed successfully',
      data: {
        user: updatedUser.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Assign manager error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Manager not found') || 
          error.message.includes('Manager must belong') ||
          error.message.includes('Manager must have') ||
          error.message.includes('cannot be their own manager') ||
          error.message.includes('circular manager relationship')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'MANAGER_VALIDATION_ERROR'
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during manager assignment',
      code: 'MANAGER_ASSIGNMENT_ERROR'
    });
  }
});

export default router;