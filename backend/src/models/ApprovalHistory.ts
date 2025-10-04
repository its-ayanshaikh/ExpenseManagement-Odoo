import { v4 as uuidv4 } from 'uuid';
import { ApprovalHistory as ApprovalHistoryInterface } from '../types/database';
import { db } from '../config/database';

export class ApprovalHistory {
  public id: string;
  public expenseId: string;
  public actorId: string;
  public action: string;
  public comments: string | null;
  public metadata: Record<string, any> | null;
  public createdAt: Date;

  constructor(data: Partial<ApprovalHistoryInterface>) {
    this.id = data.id || uuidv4();
    this.expenseId = data.expense_id || '';
    this.actorId = data.actor_id || '';
    this.action = data.action || '';
    this.comments = data.comments || null;
    this.metadata = data.metadata || null;
    this.createdAt = data.created_at || new Date();
  }

  /**
   * Convert ApprovalHistory instance to database format
   * @returns ApprovalHistoryInterface - Database format object
   */
  public toDatabase(): ApprovalHistoryInterface {
    return {
      id: this.id,
      expense_id: this.expenseId,
      actor_id: this.actorId,
      action: this.action,
      comments: this.comments,
      metadata: this.metadata,
      created_at: this.createdAt,
    };
  }

  /**
   * Create ApprovalHistory from database row
   * @param row - Database row
   * @returns ApprovalHistory - ApprovalHistory instance
   */
  public static fromDatabase(row: ApprovalHistoryInterface): ApprovalHistory {
    return new ApprovalHistory(row);
  }

  /**
   * Save approval history to database
   * @returns Promise<ApprovalHistory> - Saved approval history instance
   */
  public async save(): Promise<ApprovalHistory> {
    const historyData = this.toDatabase();
    
    const [savedHistory] = await db('approval_history')
      .insert(historyData)
      .returning('*');
    
    return ApprovalHistory.fromDatabase(savedHistory);
  }

  /**
   * Find approval history by expense ID
   * @param expenseId - Expense ID
   * @returns Promise<ApprovalHistory[]> - Array of approval history instances
   */
  public static async findByExpenseId(expenseId: string): Promise<ApprovalHistory[]> {
    const history = await db('approval_history')
      .where('expense_id', expenseId)
      .orderBy('created_at', 'asc');
    return history.map(record => ApprovalHistory.fromDatabase(record));
  }

  /**
   * Log an approval action
   * @param expenseId - Expense ID
   * @param actorId - Actor ID (user who performed the action)
   * @param action - Action performed
   * @param comments - Optional comments
   * @param metadata - Optional metadata
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logAction(
    expenseId: string,
    actorId: string,
    action: string,
    comments?: string,
    metadata?: Record<string, any>
  ): Promise<ApprovalHistory> {
    const history = new ApprovalHistory({
      expense_id: expenseId,
      actor_id: actorId,
      action,
      comments: comments || null,
      metadata: metadata || null,
    });
    
    return await history.save();
  }

  /**
   * Log expense submission
   * @param expenseId - Expense ID
   * @param submitterId - Submitter ID
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logSubmission(expenseId: string, submitterId: string): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(expenseId, submitterId, 'SUBMITTED');
  }

  /**
   * Log approval action
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @param comments - Optional comments
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logApproval(expenseId: string, approverId: string, comments?: string): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(expenseId, approverId, 'APPROVED', comments);
  }

  /**
   * Log rejection action
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @param comments - Rejection comments
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logRejection(expenseId: string, approverId: string, comments: string): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(expenseId, approverId, 'REJECTED', comments);
  }

  /**
   * Log admin override action
   * @param expenseId - Expense ID
   * @param adminId - Admin ID
   * @param action - Override action (OVERRIDE_APPROVED or OVERRIDE_REJECTED)
   * @param comments - Override reason
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logOverride(
    expenseId: string,
    adminId: string,
    action: 'OVERRIDE_APPROVED' | 'OVERRIDE_REJECTED',
    comments: string
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(expenseId, adminId, action, comments, { isOverride: true });
  }

  /**
   * Log workflow initiation
   * @param expenseId - Expense ID
   * @param initiatorId - Initiator ID (usually system or submitter)
   * @param metadata - Workflow metadata
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logWorkflowInitiation(
    expenseId: string,
    initiatorId: string,
    metadata?: Record<string, any>
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(expenseId, initiatorId, 'WORKFLOW_INITIATED', undefined, metadata);
  }

  /**
   * Log auto-approval due to conditional rules
   * @param expenseId - Expense ID
   * @param ruleId - Rule ID that triggered auto-approval
   * @param ruleType - Type of rule that triggered auto-approval
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logAutoApproval(
    expenseId: string,
    ruleId: string,
    ruleType: string
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'AUTO_APPROVED',
      `Auto-approved due to ${ruleType} rule`,
      { ruleId, ruleType, isAutoApproval: true }
    );
  }

  /**
   * Log expense status change
   * @param expenseId - Expense ID
   * @param actorId - Actor ID who triggered the change
   * @param fromStatus - Previous status
   * @param toStatus - New status
   * @param reason - Reason for status change
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logStatusChange(
    expenseId: string,
    actorId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      actorId,
      'STATUS_CHANGED',
      reason || `Status changed from ${fromStatus} to ${toStatus}`,
      { fromStatus, toStatus, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Log expense update action
   * @param expenseId - Expense ID
   * @param actorId - Actor ID who updated the expense
   * @param updatedFields - Fields that were updated
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logExpenseUpdate(
    expenseId: string,
    actorId: string,
    updatedFields: string[]
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      actorId,
      'EXPENSE_UPDATED',
      `Expense updated: ${updatedFields.join(', ')}`,
      { updatedFields, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Log expense deletion attempt
   * @param expenseId - Expense ID
   * @param actorId - Actor ID who attempted to delete
   * @param success - Whether deletion was successful
   * @param reason - Reason for deletion or failure
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logExpenseDeletion(
    expenseId: string,
    actorId: string,
    success: boolean,
    reason?: string
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      actorId,
      success ? 'EXPENSE_DELETED' : 'EXPENSE_DELETE_FAILED',
      reason || (success ? 'Expense deleted successfully' : 'Expense deletion failed'),
      { success, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Log workflow step completion
   * @param expenseId - Expense ID
   * @param stepName - Name of the workflow step
   * @param stepData - Additional step data
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logWorkflowStep(
    expenseId: string,
    stepName: string,
    stepData?: Record<string, any>
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'WORKFLOW_STEP',
      `Workflow step completed: ${stepName}`,
      { stepName, stepData, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Log notification sent
   * @param expenseId - Expense ID
   * @param recipientId - Recipient user ID
   * @param notificationType - Type of notification
   * @param success - Whether notification was sent successfully
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logNotification(
    expenseId: string,
    recipientId: string,
    notificationType: string,
    success: boolean
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'NOTIFICATION_SENT',
      `${notificationType} notification ${success ? 'sent' : 'failed'} to user`,
      { 
        recipientId, 
        notificationType, 
        success, 
        timestamp: new Date().toISOString() 
      }
    );
  }

  /**
   * Log system error or warning
   * @param expenseId - Expense ID
   * @param errorType - Type of error
   * @param errorMessage - Error message
   * @param errorData - Additional error data
   * @returns Promise<ApprovalHistory> - Created approval history instance
   */
  public static async logSystemError(
    expenseId: string,
    errorType: string,
    errorMessage: string,
    errorData?: Record<string, any>
  ): Promise<ApprovalHistory> {
    return await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'SYSTEM_ERROR',
      `${errorType}: ${errorMessage}`,
      { 
        errorType, 
        errorMessage, 
        errorData, 
        timestamp: new Date().toISOString() 
      }
    );
  }

  /**
   * Get comprehensive audit trail for an expense
   * @param expenseId - Expense ID
   * @returns Promise<ApprovalHistory[]> - Complete audit trail
   */
  public static async getAuditTrail(expenseId: string): Promise<ApprovalHistory[]> {
    return await ApprovalHistory.findByExpenseId(expenseId);
  }

  /**
   * Get audit trail filtered by action type
   * @param expenseId - Expense ID
   * @param actionTypes - Array of action types to filter by
   * @returns Promise<ApprovalHistory[]> - Filtered audit trail
   */
  public static async getAuditTrailByActions(
    expenseId: string, 
    actionTypes: string[]
  ): Promise<ApprovalHistory[]> {
    const history = await db('approval_history')
      .where('expense_id', expenseId)
      .whereIn('action', actionTypes)
      .orderBy('created_at', 'asc');
    return history.map(record => ApprovalHistory.fromDatabase(record));
  }

  /**
   * Get audit trail for a specific time period
   * @param expenseId - Expense ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise<ApprovalHistory[]> - Audit trail for time period
   */
  public static async getAuditTrailByDateRange(
    expenseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApprovalHistory[]> {
    const history = await db('approval_history')
      .where('expense_id', expenseId)
      .whereBetween('created_at', [startDate, endDate])
      .orderBy('created_at', 'asc');
    return history.map(record => ApprovalHistory.fromDatabase(record));
  }
}