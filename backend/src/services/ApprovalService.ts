import { ApprovalRequest } from '../models/ApprovalRequest';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { Expense } from '../models/Expense';
import { User } from '../models/User';
import { WorkflowEngine } from './WorkflowEngine';
import { ApprovalRequestStatus, ExpenseStatus, UserRole } from '../types/database';

export interface CreateApprovalRequestDTO {
  expenseId: string;
  approverId: string;
  sequence: number;
}

export interface ApprovalDecisionDTO {
  comments?: string;
}

export interface RejectionDecisionDTO {
  comments: string;
}

export interface ApprovalHistoryWithUser {
  id: string;
  expenseId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  comments: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export class ApprovalService {
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  /**
   * Create an approval request
   * @param data - Approval request data
   * @returns Promise<ApprovalRequest> - Created approval request
   */
  public async createApprovalRequest(data: CreateApprovalRequestDTO): Promise<ApprovalRequest> {
    // Validate expense exists
    const expense = await Expense.findById(data.expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Validate approver exists
    const approver = await User.findById(data.approverId);
    if (!approver) {
      throw new Error('Approver not found');
    }

    // Validate approver belongs to same company as expense
    if (approver.companyId !== expense.companyId) {
      throw new Error('Approver does not belong to the same company as the expense');
    }

    // Check if approval request already exists for this expense and approver
    const existingRequest = await ApprovalRequest.findByExpenseAndApprover(data.expenseId, data.approverId);
    if (existingRequest) {
      throw new Error('Approval request already exists for this expense and approver');
    }

    // Create the approval request
    const approvalRequest = new ApprovalRequest({
      expense_id: data.expenseId,
      approver_id: data.approverId,
      sequence: data.sequence,
      status: ApprovalRequestStatus.PENDING,
    });

    const savedRequest = await approvalRequest.save();

    // Log the approval request creation
    await ApprovalHistory.logAction(
      data.expenseId,
      'SYSTEM',
      'APPROVAL_REQUEST_CREATED',
      `Approval request created for ${approver.firstName} ${approver.lastName}`,
      {
        approverId: data.approverId,
        sequence: data.sequence,
        requestId: savedRequest.id
      }
    );

    return savedRequest;
  }

  /**
   * Approve an expense
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @param decision - Approval decision with optional comments
   * @returns Promise<void>
   */
  public async approveExpense(expenseId: string, approverId: string, decision: ApprovalDecisionDTO): Promise<void> {
    // Validate expense exists and is in pending status
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error('Expense is not in pending status and cannot be approved');
    }

    // Validate approver exists
    const approver = await User.findById(approverId);
    if (!approver) {
      throw new Error('Approver not found');
    }

    // Validate approver belongs to same company as expense
    if (approver.companyId !== expense.companyId) {
      throw new Error('Approver does not belong to the same company as the expense');
    }

    // Validate approver has permission to approve (Manager or Admin)
    if (approver.role !== UserRole.MANAGER && approver.role !== UserRole.ADMIN) {
      throw new Error('User does not have permission to approve expenses');
    }

    // Find the approval request for this approver
    const approvalRequest = await ApprovalRequest.findByExpenseAndApprover(expenseId, approverId);
    if (!approvalRequest) {
      throw new Error('No approval request found for this approver');
    }

    if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
      throw new Error('Approval request is not in pending status');
    }

    // Process the approval through the workflow engine
    await this.workflowEngine.processApproval(expenseId, approverId, {
      decision: 'APPROVED',
      comments: decision.comments
    });
  }

  /**
   * Reject an expense
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @param decision - Rejection decision with required comments
   * @returns Promise<void>
   */
  public async rejectExpense(expenseId: string, approverId: string, decision: RejectionDecisionDTO): Promise<void> {
    // Validate expense exists and is in pending status
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error('Expense is not in pending status and cannot be rejected');
    }

    // Validate approver exists
    const approver = await User.findById(approverId);
    if (!approver) {
      throw new Error('Approver not found');
    }

    // Validate approver belongs to same company as expense
    if (approver.companyId !== expense.companyId) {
      throw new Error('Approver does not belong to the same company as the expense');
    }

    // Validate approver has permission to reject (Manager or Admin)
    if (approver.role !== UserRole.MANAGER && approver.role !== UserRole.ADMIN) {
      throw new Error('User does not have permission to reject expenses');
    }

    // Validate comments are provided
    if (!decision.comments || decision.comments.trim().length === 0) {
      throw new Error('Comments are required when rejecting an expense');
    }

    // Find the approval request for this approver
    const approvalRequest = await ApprovalRequest.findByExpenseAndApprover(expenseId, approverId);
    if (!approvalRequest) {
      throw new Error('No approval request found for this approver');
    }

    if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
      throw new Error('Approval request is not in pending status');
    }

    // Process the rejection through the workflow engine
    await this.workflowEngine.processApproval(expenseId, approverId, {
      decision: 'REJECTED',
      comments: decision.comments.trim()
    });
  }

  /**
   * Get approval history for an expense with user details
   * @param expenseId - Expense ID
   * @returns Promise<ApprovalHistoryWithUser[]> - Approval history with user information
   */
  public async getApprovalHistory(expenseId: string): Promise<ApprovalHistoryWithUser[]> {
    // Validate expense exists
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Get approval history
    const history = await ApprovalHistory.findByExpenseId(expenseId);

    // Enrich history with user details
    const enrichedHistory: ApprovalHistoryWithUser[] = [];

    for (const record of history) {
      let actorName = 'System';
      let actorRole = UserRole.EMPLOYEE; // Default role

      if (record.actorId !== 'SYSTEM') {
        const actor = await User.findById(record.actorId);
        if (actor) {
          actorName = `${actor.firstName} ${actor.lastName}`;
          actorRole = actor.role;
        } else {
          actorName = 'Unknown User';
        }
      }

      enrichedHistory.push({
        id: record.id,
        expenseId: record.expenseId,
        actorId: record.actorId,
        actorName,
        actorRole,
        action: record.action,
        comments: record.comments,
        metadata: record.metadata,
        createdAt: record.createdAt
      });
    }

    return enrichedHistory;
  }

  /**
   * Check if a user can approve a specific expense
   * @param expenseId - Expense ID
   * @param userId - User ID
   * @returns Promise<boolean> - True if user can approve the expense
   */
  public async canUserApproveExpense(expenseId: string, userId: string): Promise<boolean> {
    // Validate expense exists
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return false;
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    // Check if user belongs to same company as expense
    if (user.companyId !== expense.companyId) {
      return false;
    }

    // Check if user has permission to approve (Manager or Admin)
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
      return false;
    }

    // Check if expense is in pending status
    if (expense.status !== ExpenseStatus.PENDING) {
      return false;
    }

    // Check if there's a pending approval request for this user
    const approvalRequest = await ApprovalRequest.findByExpenseAndApprover(expenseId, userId);
    if (!approvalRequest || approvalRequest.status !== ApprovalRequestStatus.PENDING) {
      return false;
    }

    return true;
  }

  /**
   * Get pending approval requests for a user
   * @param userId - User ID
   * @returns Promise<ApprovalRequest[]> - Pending approval requests
   */
  public async getPendingApprovalRequestsForUser(userId: string): Promise<ApprovalRequest[]> {
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission to approve (Manager or Admin)
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
      throw new Error('User does not have permission to approve expenses');
    }

    // Get pending approval requests for this user
    return await ApprovalRequest.findPendingByApproverId(userId);
  }

  /**
   * Admin override approval for an expense
   * @param expenseId - Expense ID
   * @param adminId - Admin ID
   * @param decision - Override decision with required comments
   * @returns Promise<void>
   */
  public async adminOverrideApproval(expenseId: string, adminId: string, decision: RejectionDecisionDTO): Promise<void> {
    // Validate expense exists
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Validate admin exists
    const admin = await User.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Validate admin belongs to same company as expense
    if (admin.companyId !== expense.companyId) {
      throw new Error('Admin does not belong to the same company as the expense');
    }

    // Validate user is admin
    if (admin.role !== UserRole.ADMIN) {
      throw new Error('User does not have admin privileges to override approvals');
    }

    // Validate comments are provided
    if (!decision.comments || decision.comments.trim().length === 0) {
      throw new Error('Comments are required for admin override');
    }

    // Update expense status to approved
    await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);

    // Log the admin override
    await ApprovalHistory.logOverride(
      expenseId,
      adminId,
      'OVERRIDE_APPROVED',
      decision.comments.trim()
    );

    // Log workflow completion
    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'WORKFLOW_COMPLETED',
      'Expense approved by admin override',
      { 
        finalStatus: ExpenseStatus.APPROVED, 
        reason: 'admin_override',
        overriddenBy: adminId
      }
    );
  }

  /**
   * Admin override rejection for an expense
   * @param expenseId - Expense ID
   * @param adminId - Admin ID
   * @param decision - Override decision with required comments
   * @returns Promise<void>
   */
  public async adminOverrideRejection(expenseId: string, adminId: string, decision: RejectionDecisionDTO): Promise<void> {
    // Validate expense exists
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Validate admin exists
    const admin = await User.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Validate admin belongs to same company as expense
    if (admin.companyId !== expense.companyId) {
      throw new Error('Admin does not belong to the same company as the expense');
    }

    // Validate user is admin
    if (admin.role !== UserRole.ADMIN) {
      throw new Error('User does not have admin privileges to override approvals');
    }

    // Validate comments are provided
    if (!decision.comments || decision.comments.trim().length === 0) {
      throw new Error('Comments are required for admin override');
    }

    // Update expense status to rejected
    await Expense.updateStatus(expenseId, ExpenseStatus.REJECTED);

    // Log the admin override
    await ApprovalHistory.logOverride(
      expenseId,
      adminId,
      'OVERRIDE_REJECTED',
      decision.comments.trim()
    );

    // Log workflow completion
    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'WORKFLOW_COMPLETED',
      'Expense rejected by admin override',
      { 
        finalStatus: ExpenseStatus.REJECTED, 
        reason: 'admin_override',
        overriddenBy: adminId
      }
    );
  }
}