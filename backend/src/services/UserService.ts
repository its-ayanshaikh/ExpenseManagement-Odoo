import { User } from '../models/User';
import { UserRole } from '../types/database';
import { db } from '../config/database';

export interface CreateUserDTO {
  companyId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  managerId?: string;
  isManagerApprover?: boolean;
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  managerId?: string;
  isManagerApprover?: boolean;
}

export class UserService {
  /**
   * Create a new user
   * @param data - User creation data
   * @returns Promise<User> - Created user instance
   */
  public static async createUser(data: CreateUserDTO): Promise<User> {
    // Check if email already exists
    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate manager exists if managerId is provided
    if (data.managerId) {
      const manager = await User.findById(data.managerId);
      if (!manager) {
        throw new Error('Manager not found');
      }
      
      // Ensure manager belongs to the same company
      if (manager.companyId !== data.companyId) {
        throw new Error('Manager must belong to the same company');
      }

      // Ensure manager has appropriate role
      if (manager.role === UserRole.EMPLOYEE) {
        throw new Error('Manager must have MANAGER or ADMIN role');
      }
    }

    // Create user instance
    const user = new User({
      company_id: data.companyId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      manager_id: data.managerId || null,
      is_manager_approver: data.isManagerApprover || false,
    });

    // Set password
    await user.setPassword(data.password);

    // Save to database
    return await user.save();
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns Promise<User | null> - User instance or null if not found
   */
  public static async getUserById(id: string): Promise<User | null> {
    return await User.findById(id);
  }

  /**
   * Get all users by company ID
   * @param companyId - Company ID
   * @returns Promise<User[]> - Array of user instances
   */
  public static async getUsersByCompany(companyId: string): Promise<User[]> {
    return await User.findByCompanyId(companyId);
  }

  /**
   * Update user
   * @param id - User ID
   * @param data - Update data
   * @returns Promise<User> - Updated user instance
   */
  public static async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if email is being changed and if it already exists
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('User with this email already exists');
      }
    }

    // Validate manager if managerId is being updated
    if (data.managerId !== undefined) {
      if (data.managerId) {
        const manager = await User.findById(data.managerId);
        if (!manager) {
          throw new Error('Manager not found');
        }
        
        // Ensure manager belongs to the same company
        if (manager.companyId !== user.companyId) {
          throw new Error('Manager must belong to the same company');
        }

        // Ensure manager has appropriate role
        if (manager.role === UserRole.EMPLOYEE) {
          throw new Error('Manager must have MANAGER or ADMIN role');
        }

        // Prevent self-assignment as manager
        if (manager.id === id) {
          throw new Error('User cannot be their own manager');
        }
      }
    }

    // Update user properties
    if (data.email !== undefined) user.email = data.email;
    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.role !== undefined) user.role = data.role;
    if (data.managerId !== undefined) user.managerId = data.managerId;
    if (data.isManagerApprover !== undefined) user.isManagerApprover = data.isManagerApprover;

    // Save updated user
    return await user.save();
  }

  /**
   * Delete user with validation for pending approvals
   * @param id - User ID
   * @returns Promise<void>
   */
  public static async deleteUser(id: string): Promise<void> {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check for pending approval requests where this user is the approver
    const pendingApprovals = await db('approval_requests')
      .where('approver_id', id)
      .where('status', 'PENDING')
      .count('* as count')
      .first() as { count: string } | undefined;

    if (pendingApprovals && Number(pendingApprovals.count) > 0) {
      throw new Error('Cannot delete user with pending approval requests');
    }

    // Check for expenses submitted by this user that are still pending
    const pendingExpenses = await db('expenses')
      .where('submitter_id', id)
      .where('status', 'PENDING')
      .count('* as count')
      .first() as { count: string } | undefined;

    if (pendingExpenses && Number(pendingExpenses.count) > 0) {
      throw new Error('Cannot delete user with pending expense submissions');
    }

    // Check if this user is a manager for other users
    const managedUsers = await db('users')
      .where('manager_id', id)
      .count('* as count')
      .first() as { count: string } | undefined;

    if (managedUsers && Number(managedUsers.count) > 0) {
      throw new Error('Cannot delete user who is managing other users. Please reassign managed users first.');
    }

    // Delete the user
    const deleted = await User.deleteById(id);
    if (!deleted) {
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Assign role to user
   * @param userId - User ID
   * @param role - New role to assign
   * @returns Promise<User> - Updated user instance
   */
  public static async assignRole(userId: string, role: UserRole): Promise<User> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If changing from MANAGER/ADMIN to EMPLOYEE, check if user is managing others
    if ((user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) && role === UserRole.EMPLOYEE) {
      const managedUsers = await db('users')
        .where('manager_id', userId)
        .count('* as count')
        .first() as { count: string } | undefined;

      if (managedUsers && Number(managedUsers.count) > 0) {
        throw new Error('Cannot change role to EMPLOYEE while user is managing other users. Please reassign managed users first.');
      }
    }

    // Update role
    user.role = role;
    return await user.save();
  }

  /**
   * Assign manager to user with circular relationship validation
   * @param userId - User ID
   * @param managerId - Manager ID (null to remove manager)
   * @returns Promise<User> - Updated user instance
   */
  public static async assignManager(userId: string, managerId: string | null): Promise<User> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) {
        throw new Error('Manager not found');
      }

      // Ensure manager belongs to the same company
      if (manager.companyId !== user.companyId) {
        throw new Error('Manager must belong to the same company');
      }

      // Ensure manager has appropriate role
      if (manager.role === UserRole.EMPLOYEE) {
        throw new Error('Manager must have MANAGER or ADMIN role');
      }

      // Prevent self-assignment as manager
      if (managerId === userId) {
        throw new Error('User cannot be their own manager');
      }

      // Check for circular manager relationships
      await this.validateNoCircularManagerRelationship(userId, managerId);
    }

    // Update manager
    user.managerId = managerId;
    return await user.save();
  }

  /**
   * Validate that assigning a manager doesn't create circular relationships
   * @param userId - User ID
   * @param managerId - Proposed manager ID
   * @returns Promise<void>
   * @throws Error if circular relationship would be created
   */
  private static async validateNoCircularManagerRelationship(userId: string, managerId: string): Promise<void> {
    const visited = new Set<string>();
    let currentManagerId: string | null = managerId;

    // Traverse up the manager chain to check for cycles
    while (currentManagerId && !visited.has(currentManagerId)) {
      visited.add(currentManagerId);

      // If we encounter the original user in the chain, it's a circular relationship
      if (currentManagerId === userId) {
        throw new Error('Cannot assign manager: would create circular manager relationship');
      }

      // Get the next manager in the chain
      const currentManager = await User.findById(currentManagerId);
      if (!currentManager) {
        break; // Manager not found, chain ends here
      }

      currentManagerId = currentManager.managerId;
    }

    // If we hit a visited node (other than the original user), there's a cycle in the existing structure
    if (currentManagerId && visited.has(currentManagerId)) {
      throw new Error('Cannot assign manager: would create circular manager relationship');
    }
  }

  /**
   * Get all direct reports for a manager
   * @param managerId - Manager ID
   * @returns Promise<User[]> - Array of users managed by this manager
   */
  public static async getDirectReports(managerId: string): Promise<User[]> {
    const users = await db('users')
      .where('manager_id', managerId)
      .orderBy('first_name', 'asc')
      .orderBy('last_name', 'asc');

    return users.map(user => User.fromDatabase(user));
  }

  /**
   * Get all users in a manager's hierarchy (direct and indirect reports)
   * @param managerId - Manager ID
   * @returns Promise<User[]> - Array of all users in the hierarchy
   */
  public static async getManagerHierarchy(managerId: string): Promise<User[]> {
    const allUsers: User[] = [];
    const directReports = await this.getDirectReports(managerId);
    
    allUsers.push(...directReports);

    // Recursively get reports of each direct report
    for (const report of directReports) {
      if (report.role === UserRole.MANAGER || report.role === UserRole.ADMIN) {
        const subReports = await this.getManagerHierarchy(report.id);
        allUsers.push(...subReports);
      }
    }

    return allUsers;
  }
}