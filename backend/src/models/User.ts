import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User as UserInterface, UserRole } from '../types/database';
import { db } from '../config/database';

export class User {
  public id: string;
  public companyId: string;
  public email: string;
  public passwordHash: string;
  public firstName: string;
  public lastName: string;
  public role: UserRole;
  public managerId: string | null;
  public isManagerApprover: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<UserInterface>) {
    this.id = data.id || uuidv4();
    this.companyId = data.company_id || '';
    this.email = data.email || '';
    this.passwordHash = data.password_hash || '';
    this.firstName = data.first_name || '';
    this.lastName = data.last_name || '';
    this.role = data.role || UserRole.EMPLOYEE;
    this.managerId = data.manager_id || null;
    this.isManagerApprover = data.is_manager_approver || false;
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  /**
   * Hash a plain text password using bcrypt
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with the hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password from database
   * @returns Promise<boolean> - True if passwords match
   */
  public static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Set password for the user instance
   * @param password - Plain text password
   */
  public async setPassword(password: string): Promise<void> {
    this.passwordHash = await User.hashPassword(password);
    this.updatedAt = new Date();
  }

  /**
   * Verify password for the user instance
   * @param password - Plain text password
   * @returns Promise<boolean> - True if password matches
   */
  public async verifyPassword(password: string): Promise<boolean> {
    return await User.comparePassword(password, this.passwordHash);
  }

  /**
   * Convert User instance to database format
   * @returns UserInterface - Database format object
   */
  public toDatabase(): UserInterface {
    return {
      id: this.id,
      company_id: this.companyId,
      email: this.email,
      password_hash: this.passwordHash,
      first_name: this.firstName,
      last_name: this.lastName,
      role: this.role,
      manager_id: this.managerId,
      is_manager_approver: this.isManagerApprover,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Convert User instance to safe format (without password hash)
   * @returns Omit<UserInterface, 'password_hash'> - Safe user object
   */
  public toSafeObject(): Omit<UserInterface, 'password_hash'> {
    const { password_hash, ...safeUser } = this.toDatabase();
    return safeUser;
  }

  /**
   * Create User from database row
   * @param row - Database row
   * @returns User - User instance
   */
  public static fromDatabase(row: UserInterface): User {
    return new User(row);
  }

  /**
   * Save user to database
   * @returns Promise<User> - Saved user instance
   */
  public async save(): Promise<User> {
    this.updatedAt = new Date();
    const userData = this.toDatabase();
    
    const [savedUser] = await db('users')
      .insert(userData)
      .onConflict('id')
      .merge(['email', 'password_hash', 'first_name', 'last_name', 'role', 'manager_id', 'is_manager_approver', 'updated_at'])
      .returning('*');
    
    return User.fromDatabase(savedUser);
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns Promise<User | null> - User instance or null
   */
  public static async findById(id: string): Promise<User | null> {
    const user = await db('users').where('id', id).first();
    return user ? User.fromDatabase(user) : null;
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns Promise<User | null> - User instance or null
   */
  public static async findByEmail(email: string): Promise<User | null> {
    const user = await db('users').where('email', email).first();
    return user ? User.fromDatabase(user) : null;
  }

  /**
   * Find users by company ID
   * @param companyId - Company ID
   * @returns Promise<User[]> - Array of user instances
   */
  public static async findByCompanyId(companyId: string): Promise<User[]> {
    const users = await db('users').where('company_id', companyId);
    return users.map(user => User.fromDatabase(user));
  }

  /**
   * Delete user by ID
   * @param id - User ID
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await db('users').where('id', id).del();
    return deletedCount > 0;
  }
}