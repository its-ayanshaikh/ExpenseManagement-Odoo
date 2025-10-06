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
      await this.convertAndApproveExpense(expenseId);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'AUTO_APPROVED',
        'No approval rules configured'
      );
      return;
    }

    // Get the first (or only) approval rule
    const rule = approvalRules[0];
    await rule.loadApprovers();

    if (!rule.approvers || rule.approvers.length === 0) {
      // No approvers configured, auto-approve
      await this.convertAndApproveExpense(expenseId);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'AUTO_APPROVED',
        'No approvers configured in approval rule'
      );
      return;
    }

    // Filter to get only required approvers
    const requiredApprovers = rule.approvers.filter(a => a.isRequired);

    if (requiredApprovers.length === 0) {
      // No required approvers, auto-approve
      await this.convertAndApproveExpense(expenseId);
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'AUTO_APPROVED',
        'No required approvers configured'
      );
      return;
    }

    // Check if sequential or parallel approval
    if (rule.isSequentialApproval) {
      // Sequential: Create request for first approver only
      const sortedApprovers = requiredApprovers.sort((a, b) => a.sequence - b.sequence);
      const firstApprover = sortedApprovers[0];

      const request = new ApprovalRequest({
        expense_id: expenseId,
        approver_id: firstApprover.approverId,
        sequence: 1, // Start from 1 (0 is reserved for manager approval)
        status: ApprovalRequestStatus.PENDING,
      });

      await request.save();

      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'APPROVAL_REQUEST_CREATED',
        `Sequential approval request created (first approver)`,
        { 
          approverId: firstApprover.approverId, 
          sequence: 1, 
          ruleId: rule.id,
          isSequential: true
        }
      );
    } else {
      // Parallel: Create requests for all required approvers simultaneously
      for (const approver of requiredApprovers) {
        const request = new ApprovalRequest({
          expense_id: expenseId,
          approver_id: approver.approverId,
          sequence: 1, // All parallel approvals have same sequence
          status: ApprovalRequestStatus.PENDING,
        });

        await request.save();

        await ApprovalHistory.logAction(
          expenseId,
          'SYSTEM',
          'APPROVAL_REQUEST_CREATED',
          `Parallel approval request created`,
          { 
            approverId: approver.approverId, 
            sequence: 1, 
            ruleId: rule.id,
            isSequential: false
          }
        );
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

    // Handle approval - check if this was manager approval (sequence 0)
    const submitter = await User.findById(expense.submitterId);
    if (!submitter) {
      throw new Error('Expense submitter not found');
    }

    if (approvalRequest.sequence === 0 && submitter.isManagerApprover) {
      // Manager approved, now proceed to required approvers
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'MANAGER_APPROVED',
        'Manager approval complete, proceeding to required approvers',
        { managerId: approverId }
      );

      await this.createRuleBasedApprovalRequests(expenseId, expense.companyId);
      return;
    }

    // Check if all required approvers have approved
    const allRequiredApproved = await this.checkAllRequiredApproversApproved(expenseId);

    if (allRequiredApproved) {
      // All required approvers have approved, convert currency and approve
      await this.convertAndApproveExpense(expenseId);
      return;
    }

    // Check if sequential approval is enabled
    const isSequential = await this.isSequentialApprovalEnabled(expense.companyId);

    if (isSequential) {
      // Sequential approval: send to next approver
      const approvalRules = await ApprovalRule.findByCompanyId(expense.companyId);
      if (approvalRules.length > 0) {
        const rule = approvalRules[0];
        await rule.loadApprovers();

        if (rule.approvers) {
          const requiredApprovers = rule.approvers.filter(a => a.isRequired);
          const sortedApprovers = requiredApprovers.sort((a, b) => a.sequence - b.sequence);

          // Find the next approver who hasn't approved yet
          for (const approver of sortedApprovers) {
            const hasApproved = await ApprovalRequest.hasApproverApproved(expenseId, approver.approverId);
            if (!hasApproved) {
              // Check if request already exists
              const existingRequest = await ApprovalRequest.findByExpenseAndApprover(expenseId, approver.approverId);
              if (!existingRequest) {
                // Create request for next approver
                const nextSequence = approvalRequest.sequence + 1;
                const user = await User.findById(approver.approverId);
                if (user) {
                  await this.sendSequentialApprovalRequest(expenseId, user, nextSequence);
                }
              }
              break;
            }
          }
        }
      }
    }
    // For parallel approval, all requests are already created, so just wait for all to approve
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
   * Convert expense currency and approve the expense
   * @param expenseId - Expense ID
   * @returns Promise<void>
   */
  private async convertAndApproveExpense(expenseId: string): Promise<void> {
    try {
      // Import ExpenseService to avoid circular dependency
      const { ExpenseService } = await import('./ExpenseService');
      
      // Convert currency
      await ExpenseService.convertExpenseCurrency(expenseId);
      
      // Update expense status to approved
      await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);
      
      // Log workflow completion
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED',
        'Expense approved and currency converted',
        { finalStatus: ExpenseStatus.APPROVED }
      );
    } catch (error) {
      // Log the error but still approve the expense
      // Currency conversion failure shouldn't block approval
      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'WORKFLOW_COMPLETED_WITH_WARNING',
        `Expense approved but currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          finalStatus: ExpenseStatus.APPROVED,
          conversionError: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      // Still approve the expense
      await Expense.updateStatus(expenseId, ExpenseStatus.APPROVED);
    }
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

  /**
   * Check if manager approval is required for an employee
   * @param employeeId - Employee ID
   * @returns Promise<boolean> - True if manager approval is required
   */
  public async checkManagerApproverRequired(employeeId: string): Promise<boolean> {
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee.isManagerApprover && !!employee.managerId;
  }

  /**
   * Get required approvers from approval rule
   * @param companyId - Company ID
   * @returns Promise<User[]> - Array of required approvers
   */
  public async getRequiredApprovers(companyId: string): Promise<User[]> {
    const approvalRules = await ApprovalRule.findByCompanyId(companyId);
    
    if (approvalRules.length === 0) {
      return [];
    }

    const rule = approvalRules[0];
    await rule.loadApprovers();

    if (!rule.approvers) {
      return [];
    }

    const requiredApprovers = rule.approvers.filter(a => a.isRequired);
    const users: User[] = [];

    for (const approver of requiredApprovers) {
      const user = await User.findById(approver.approverId);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }

  /**
   * Check if sequential approval is enabled for a company
   * @param companyId - Company ID
   * @returns Promise<boolean> - True if sequential approval is enabled
   */
  public async isSequentialApprovalEnabled(companyId: string): Promise<boolean> {
    const approvalRules = await ApprovalRule.findByCompanyId(companyId);
    
    if (approvalRules.length === 0) {
      return false;
    }

    return approvalRules[0].isSequentialApproval;
  }

  /**
   * Send parallel approval requests to all required approvers
   * @param expenseId - Expense ID
   * @param approvers - Array of approvers
   * @returns Promise<void>
   */
  public async sendParallelApprovalRequests(expenseId: string, approvers: User[]): Promise<void> {
    for (const approver of approvers) {
      const request = new ApprovalRequest({
        expense_id: expenseId,
        approver_id: approver.id,
        sequence: 1,
        status: ApprovalRequestStatus.PENDING,
      });

      await request.save();

      await ApprovalHistory.logAction(
        expenseId,
        'SYSTEM',
        'APPROVAL_REQUEST_CREATED',
        `Parallel approval request sent to ${approver.firstName} ${approver.lastName}`,
        { 
          approverId: approver.id, 
          sequence: 1,
          isParallel: true
        }
      );
    }
  }

  /**
   * Send sequential approval request to a specific approver
   * @param expenseId - Expense ID
   * @param approver - Approver user
   * @param sequence - Sequence number
   * @returns Promise<void>
   */
  public async sendSequentialApprovalRequest(expenseId: string, approver: User, sequence: number): Promise<void> {
    const request = new ApprovalRequest({
      expense_id: expenseId,
      approver_id: approver.id,
      sequence: sequence,
      status: ApprovalRequestStatus.PENDING,
    });

    await request.save();

    await ApprovalHistory.logAction(
      expenseId,
      'SYSTEM',
      'APPROVAL_REQUEST_CREATED',
      `Sequential approval request sent to ${approver.firstName} ${approver.lastName}`,
      { 
        approverId: approver.id, 
        sequence: sequence,
        isSequential: true
      }
    );
  }

  /**
   * Check if all required approvers have approved
   * @param expenseId - Expense ID
   * @returns Promise<boolean> - True if all required approvers have approved
   */
  public async checkAllRequiredApproversApproved(expenseId: string): Promise<boolean> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    const approvalRules = await ApprovalRule.findByCompanyId(expense.companyId);
    
    if (approvalRules.length === 0) {
      return true;
    }

    const rule = approvalRules[0];
    await rule.loadApprovers();

    if (!rule.approvers) {
      return true;
    }

    const requiredApprovers = rule.approvers.filter(a => a.isRequired);

    if (requiredApprovers.length === 0) {
      return true;
    }

    // Check if all required approvers have approved
    for (const approver of requiredApprovers) {
      const hasApproved = await ApprovalRequest.hasApproverApproved(expenseId, approver.approverId);
      if (!hasApproved) {
        return false;
      }
    }

    return true;
  }
}