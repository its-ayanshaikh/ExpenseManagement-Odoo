import { v4 as uuidv4 } from 'uuid';
import { ApprovalRequest as ApprovalRequestInterface, ApprovalRequestStatus } from '../types/database';
import { db } from '../config/database';

export class ApprovalRequest {
  public id: string;
  public expenseId: string;
  public approverId: string;
  public sequence: number;
  public status: ApprovalRequestStatus;
  public comments: string | null;
  public respondedAt: Date | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<ApprovalRequestInterface>) {
    this.id = data.id || uuidv4();
    this.expenseId = data.expense_id || '';
    this.approverId = data.approver_id || '';
    this.sequence = data.sequence || 0;
    this.status = data.status || ApprovalRequestStatus.PENDING;
    this.comments = data.comments || null;
    this.respondedAt = data.responded_at || null;
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  /**
   * Convert ApprovalRequest instance to database format
   * @returns ApprovalRequestInterface - Database format object
   */
  public toDatabase(): ApprovalRequestInterface {
    return {
      id: this.id,
      expense_id: this.expenseId,
      approver_id: this.approverId,
      sequence: this.sequence,
      status: this.status,
      comments: this.comments,
      responded_at: this.respondedAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Create ApprovalRequest from database row
   * @param row - Database row
   * @returns ApprovalRequest - ApprovalRequest instance
   */
  public static fromDatabase(row: ApprovalRequestInterface): ApprovalRequest {
    return new ApprovalRequest(row);
  }

  /**
   * Save approval request to database
   * @returns Promise<ApprovalRequest> - Saved approval request instance
   */
  public async save(): Promise<ApprovalRequest> {
    this.updatedAt = new Date();
    const requestData = this.toDatabase();
    
    const [savedRequest] = await db('approval_requests')
      .insert(requestData)
      .onConflict('id')
      .merge(['status', 'comments', 'responded_at', 'updated_at'])
      .returning('*');
    
    return ApprovalRequest.fromDatabase(savedRequest);
  }

  /**
   * Find approval request by ID
   * @param id - Approval request ID
   * @returns Promise<ApprovalRequest | null> - ApprovalRequest instance or null
   */
  public static async findById(id: string): Promise<ApprovalRequest | null> {
    const request = await db('approval_requests').where('id', id).first();
    return request ? ApprovalRequest.fromDatabase(request) : null;
  }

  /**
   * Find approval requests by expense ID
   * @param expenseId - Expense ID
   * @returns Promise<ApprovalRequest[]> - Array of approval request instances
   */
  public static async findByExpenseId(expenseId: string): Promise<ApprovalRequest[]> {
    const requests = await db('approval_requests')
      .where('expense_id', expenseId)
      .orderBy('sequence', 'asc');
    return requests.map(request => ApprovalRequest.fromDatabase(request));
  }

  /**
   * Find pending approval requests by approver ID
   * @param approverId - Approver ID
   * @returns Promise<ApprovalRequest[]> - Array of pending approval request instances
   */
  public static async findPendingByApproverId(approverId: string): Promise<ApprovalRequest[]> {
    const requests = await db('approval_requests')
      .where('approver_id', approverId)
      .where('status', ApprovalRequestStatus.PENDING)
      .orderBy('created_at', 'asc');
    return requests.map(request => ApprovalRequest.fromDatabase(request));
  }

  /**
   * Find approval request by expense ID and approver ID
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @returns Promise<ApprovalRequest | null> - ApprovalRequest instance or null
   */
  public static async findByExpenseAndApprover(expenseId: string, approverId: string): Promise<ApprovalRequest | null> {
    const request = await db('approval_requests')
      .where('expense_id', expenseId)
      .where('approver_id', approverId)
      .first();
    return request ? ApprovalRequest.fromDatabase(request) : null;
  }

  /**
   * Get approved requests count for an expense
   * @param expenseId - Expense ID
   * @returns Promise<number> - Number of approved requests
   */
  public static async getApprovedCount(expenseId: string): Promise<number> {
    const result = await db('approval_requests')
      .where('expense_id', expenseId)
      .where('status', ApprovalRequestStatus.APPROVED)
      .count('id as count')
      .first();
    return parseInt((result as any)?.count as string) || 0;
  }

  /**
   * Get total requests count for an expense
   * @param expenseId - Expense ID
   * @returns Promise<number> - Total number of requests
   */
  public static async getTotalCount(expenseId: string): Promise<number> {
    const result = await db('approval_requests')
      .where('expense_id', expenseId)
      .count('id as count')
      .first();
    return parseInt((result as any)?.count as string) || 0;
  }

  /**
   * Check if specific approver has approved an expense
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @returns Promise<boolean> - True if approver has approved
   */
  public static async hasApproverApproved(expenseId: string, approverId: string): Promise<boolean> {
    const request = await db('approval_requests')
      .where('expense_id', expenseId)
      .where('approver_id', approverId)
      .where('status', ApprovalRequestStatus.APPROVED)
      .first();
    return !!request;
  }

  /**
   * Get next pending approval request for an expense
   * @param expenseId - Expense ID
   * @returns Promise<ApprovalRequest | null> - Next pending approval request or null
   */
  public static async getNextPending(expenseId: string): Promise<ApprovalRequest | null> {
    const request = await db('approval_requests')
      .where('expense_id', expenseId)
      .where('status', ApprovalRequestStatus.PENDING)
      .orderBy('sequence', 'asc')
      .first();
    return request ? ApprovalRequest.fromDatabase(request) : null;
  }
}