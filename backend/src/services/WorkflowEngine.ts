import { Expense } from '../models/Expense';
import { User } from '../models/User';
import { ApprovalRule } from '../models/ApprovalRule';
import { ApprovalRequest } from '../models/ApprovalRequest';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { ApprovalRuleType, ApprovalRequestStatus, ExpenseStatus } from '../types/database';

export interface ApprovalDecision {
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
}

export class WorkflowEngine {
  /**
   * Initiate approval workflow for an expense
   * @param expenseId - Expense ID
   * @returns Promise<void>
   */
  public async initiateWorkflow(expenseId: string): Promise<void> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Get the submitter to check IS_MANAGER_APPROVER flag
    const submitter = await User.findById(expense.submitterId);
    if (!submitter) {
      throw new Error('Expense submitter not found');
    }

    // Log workflow initiation
    await ApprovalHistory.logWorkflowInitiation(expenseId, submitter.id, {
      isManagerApprover: submitter.isManagerApprover,
      companyId: expense.companyId
    });

    // Check if manager approval is required first
    if (submitter.isManagerApprover && submitter.managerId) {
      await this.createManagerApprovalRequest(expenseId, submitter.managerId);
    } else {
      // Create approval requests based on company rules
      await this.createRuleBasedApprovalRequests(expenseId, expense.companyId);
    }
  }

  /**
   * Create manager approval request
   * @param expenseId - Expense ID
   * @param managerId - Manager ID
   * @returns Promise<void>
   */
  private async createManagerApprovalRequest(expenseId: string, managerId: string): Promise<void> {
    const managerRequest = new ApprovalRequest({
      expense_id: expenseId,
      approver_id: managerId,
      sequence: 0, // Manager approval comes first
      status: ApprovalRequestStatus.PENDING,
    });

    await managerRequest.save();

    // Log the approval request creation
    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'APPROVAL_REQUEST_CREATED',
      'Manager approval request created',
      { approverId: managerId, sequence: 0, isManagerApproval: true }
    );
  }

  /**
   * Create approval requests based on company approval rules
   * @param expenseId - Expense ID
   * @param companyId - Company ID
   * @returns Promise<void>
   */
  private async createRuleBasedApprovalRequests(expenseId: string, companyId: string): Promise<void> {
    const approvalRules = await ApprovalRule.findByCompanyId(companyId);
    
    if (approvalRules.length === 0) {
      // No approval rules configured, auto-approve
      await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'AUTO_APPROVED',
        'No approval rules configured'
      );
      return;
    }

    let sequence = 1; // Start from 1 if manager approval exists, or 0 if not

    // Check if manager approval was created first
    const existingRequests = await ApprovalRequest.findByExpenseId(expenseId);
    if (existingRequests.length > 0) {
      sequence = Math.max(...existingRequests.map(r => r.sequence)) + 1;
    }

    for (const rule of approvalRules) {
      await rule.loadApprovers();
      
      if (rule.ruleType === ApprovalRuleType.SEQUENTIAL && rule.approvers) {
        // Create sequential approval requests
        for (const approver of rule.approvers) {
          const request = new ApprovalRequest({
            expense_id: expenseId,
            approver_id: approver.approverId,
            sequence: sequence,
            status: ApprovalRequestStatus.PENDING,
          });

          await request.save();

          // Log the approval request creation
          await ApprovalHistory.logAction(
            expenseId,
            'SYSTEM',
            'APPROVAL_REQUEST_CREATED',
            `Sequential approval request created for rule: ${rule.name}`,
            { 
              approverId: approver.approverId, 
              sequence: sequence, 
              ruleId: rule.id,
              ruleType: rule.ruleType 
            }
          );

          sequence++;
        }
      } else if (rule.ruleType === ApprovalRuleType.PERCENTAGE || 
                 rule.ruleType === ApprovalRuleType.SPECIFIC_APPROVER || 
                 rule.ruleType === ApprovalRuleType.HYBRID) {
        // For conditional rules, create requests for all approvers at the same sequence level
        if (rule.approvers) {
          for (const approver of rule.approvers) {
            const request = new ApprovalRequest({
              expense_id: expenseId,
              approver_id: approver.approverId,
              sequence: sequence,
              status: ApprovalRequestStatus.PENDING,
            });

            await request.save();

            // Log the approval request creation
            await ApprovalHistory.logAction(
              expenseId,
              'SYSTEM',
              'APPROVAL_REQUEST_CREATED',
              `Conditional approval request created for rule: ${rule.name}`,
              { 
                approverId: approver.approverId, 
                sequence: sequence, 
                ruleId: rule.id,
                ruleType: rule.ruleType 
              }
            );
          }
          sequence++;
        }
      }
    }
  }

  /**
   * Process an approval decision
   * @param expenseId - Expense ID
   * @param approverId - Approver ID
   * @param decision - Approval decision
   * @returns Promise<void>
   */
  public async processApproval(expenseId: string, approverId: string, decision: ApprovalDecision): Promise<void> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error('Expense is not in pending status');
    }

    // Find the approval request for this approver
    const approvalRequest = await ApprovalRequest.findByExpenseAndApprover(expenseId, approverId);
    if (!approvalRequest) {
      throw new Error('Approval request not found for this approver');
    }

    if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
      throw new Error('Approval request is not in pending status');
    }

    // Update the approval request
    approvalRequest.status = decision.decision === 'APPROVED' 
      ? ApprovalRequestStatus.APPROVED 
      : ApprovalRequestStatus.REJECTED;
    approvalRequest.comments = decision.comments || null;
    approvalRequest.respondedAt = new Date();
    await approvalRequest.save();

    // Log the approval action
    if (decision.decision === 'APPROVED') {
      await ApprovalHistory.logApproval(expenseId, approverId, decision.comments);
    } else {
      await ApprovalHistory.logRejection(expenseId, approverId, decision.comments || 'No comments provided');
    }

    // Handle rejection - immediately reject the expense
    if (decision.decision === 'REJECTED') {
      await Expense.updateStatus(expenseId, ExpenseStatus.REJECTED);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED',
        'Expense rejected by approver',
        { finalStatus: ExpenseStatus.REJECTED, rejectedBy: approverId }
      );
      return;
    }

    // Handle approval - check if workflow should continue or complete
    await this.evaluateWorkflowCompletion(expenseId);
  }

  /**
   * Get the next approver in the sequence
   * @param expenseId - Expense ID
   * @returns Promise<User | null> - Next approver or null if no more approvers
   */
  public async getNextApprover(expenseId: string): Promise<User | null> {
    const nextRequest = await ApprovalRequest.getNextPending(expenseId);
    if (!nextRequest) {
      return null;
    }

    return await User.findById(nextRequest.approverId);
  }

  /**
   * Evaluate if the workflow is complete and update expense status accordingly
   * @param expenseId - Expense ID
   * @returns Promise<void>
   */
  private async evaluateWorkflowCompletion(expenseId: string): Promise<void> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // First check if conditional rules are met (this might auto-approve)
    const conditionalRuleMet = await this.evaluateConditionalRules(expenseId);
    if (conditionalRuleMet) {
      await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED',
        'Expense approved due to conditional rules',
        { finalStatus: ExpenseStatus.APPROVED, reason: 'conditional_rules' }
      );
      return;
    }

    // Check if there are more pending approvals
    const nextApprover = await this.getNextApprover(expenseId);
    if (!nextApprover) {
      // No more pending approvals, check if all sequential approvals are complete
      const allRequests = await ApprovalRequest.findByExpenseId(expenseId);
      const allApproved = allRequests.every(request => 
        request.status === ApprovalRequestStatus.APPROVED
      );

      if (allApproved) {
        await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);
        await ApprovalHistory.logAction(
          expenseId,
          'SYSTEM',
          'WORKFLOW_COMPLETED',
          'All approvers have approved the expense',
          { finalStatus: ExpenseStatus.APPROVED, reason: 'all_approved' }
        );
      }
    }
    // If there are more pending approvals, the workflow continues
  }

  /**
   * Evaluate conditional approval rules to determine if expense should be auto-approved
   * @param expenseId - Expense ID
   * @returns Promise<boolean> - True if conditional rules are met and expense should be approved
   */
  public async evaluateConditionalRules(expenseId: string): Promise<boolean> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    const approvalRules = await ApprovalRule.findByCompanyId(expense.companyId);
    
    // Check each rule to see if conditions are met
    for (const rule of approvalRules) {
      await rule.loadApprovers();

      // Check percentage-based rules
      if (rule.ruleType === ApprovalRuleType.PERCENTAGE || rule.isHybrid) {
        const percentageMet = await this.checkPercentageRule(expenseId, rule);
        if (percentageMet) {
          await ApprovalHistory.logAutoApproval(expenseId, rule.id, 'PERCENTAGE');
          return true;
        }
      }

      // Check specific approver rules
      if (rule.ruleType === ApprovalRuleType.SPECIFIC_APPROVER || rule.isHybrid) {
        const specificApproverMet = await this.checkSpecificApproverRule(expenseId, rule);
        if (specificApproverMet) {
          await ApprovalHistory.logAutoApproval(expenseId, rule.id, 'SPECIFIC_APPROVER');
          return true;
        }
      }

      // For hybrid rules, if either condition is met, approve
      if (rule.ruleType === ApprovalRuleType.HYBRID) {
        // Already checked both conditions above, so if we reach here, neither was met for this rule
        continue;
      }
    }

    return false;
  }

  /**
   * Check if percentage-based rule conditions are met
   * @param expenseId - Expense ID
   * @param rule - Approval rule
   * @returns Promise<boolean> - True if percentage threshold is met
   */
  private async checkPercentageRule(expenseId: string, rule: ApprovalRule): Promise<boolean> {
    if (!rule.percentageThreshold || !rule.approvers) {
      return false;
    }

    const totalApprovers = rule.approvers.length;
    if (totalApprovers === 0) {
      return false;
    }

    // Count how many of this rule's approvers have approved
    let approvedCount = 0;
    for (const approver of rule.approvers) {
      const hasApproved = await ApprovalRequest.hasApproverApproved(expenseId, approver.approverId);
      if (hasApproved) {
        approvedCount++;
      }
    }

    const approvalPercentage = (approvedCount / totalApprovers) * 100;
    
    // Log the percentage check for debugging
    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'PERCENTAGE_CHECK',
      `Percentage rule evaluation: ${approvalPercentage}% (${approvedCount}/${totalApprovers})`,
      { 
        ruleId: rule.id,
        approvalPercentage,
        approvedCount,
        totalApprovers,
        threshold: rule.percentageThreshold,
        met: approvalPercentage >= rule.percentageThreshold
      }
    );

    return approvalPercentage >= rule.percentageThreshold;
  }

  /**
   * Check if specific approver rule conditions are met
   * @param expenseId - Expense ID
   * @param rule - Approval rule
   * @returns Promise<boolean> - True if specific approver has approved
   */
  private async checkSpecificApproverRule(expenseId: string, rule: ApprovalRule): Promise<boolean> {
    if (!rule.specificApproverId) {
      return false;
    }

    const hasApproved = await ApprovalRequest.hasApproverApproved(expenseId, rule.specificApproverId);
    
    // Log the specific approver check for debugging
    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'SPECIFIC_APPROVER_CHECK',
      `Specific approver rule evaluation: ${hasApproved ? 'approved' : 'not approved'}`,
      { 
        ruleId: rule.id,
        specificApproverId: rule.specificApproverId,
        hasApproved
      }
    );

    return hasApproved;
  }

  /**
   * Check if the workflow is complete (all required approvals obtained)
   * @param expenseId - Expense ID
   * @returns Promise<boolean> - True if workflow is complete
   */
  public async isWorkflowComplete(expenseId: string): Promise<boolean> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // If expense is already approved or rejected, workflow is complete
    if (expense.status !== ExpenseStatus.PENDING) {
      return true;
    }

    // Check if conditional rules are met
    const conditionalRuleMet = await this.evaluateConditionalRules(expenseId);
    if (conditionalRuleMet) {
      return true;
    }

    // Check if all approval requests are completed
    const allRequests = await ApprovalRequest.findByExpenseId(expenseId);
    if (allRequests.length === 0) {
      return false;
    }

    // Check if any request is rejected
    const hasRejection = allRequests.some(request => 
      request.status === ApprovalRequestStatus.REJECTED
    );
    if (hasRejection) {
      return true;
    }

    // Check if all requests are approved
    const allApproved = allRequests.every(request => 
      request.status === ApprovalRequestStatus.APPROVED
    );

    return allApproved;
  }
}