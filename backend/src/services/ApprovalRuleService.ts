import { ApprovalRule, ApprovalRuleApprover } from '../models/ApprovalRule';
import { User } from '../models/User';
import { ApprovalRuleType } from '../types/database';
import { db } from '../config/database';

export interface CreateApprovalRuleDTO {
  companyId: string;
  name: string;
  ruleType: ApprovalRuleType;
  percentageThreshold?: number;
  specificApproverId?: string;
  isHybrid?: boolean;
  priority?: number;
  approvers?: Array<{
    approverId: string;
    sequence: number;
  }>;
}

export interface UpdateApprovalRuleDTO {
  name?: string;
  ruleType?: ApprovalRuleType;
  percentageThreshold?: number;
  specificApproverId?: string;
  isHybrid?: boolean;
  priority?: number;
  approvers?: Array<{
    approverId: string;
    sequence: number;
  }>;
}

export class ApprovalRuleService {
  /**
   * Create a new approval rule
   * @param data - Approval rule creation data
   * @returns Promise<ApprovalRule> - Created approval rule
   */
  public static async createApprovalRule(data: CreateApprovalRuleDTO): Promise<ApprovalRule> {
    // Validate input data
    if (!data.companyId) {
      throw new Error('Company ID is required');
    }

    if (!data.name?.trim()) {
      throw new Error('Rule name is required');
    }

    // Validate rule type specific requirements
    await this.validateRuleTypeRequirements(data.ruleType, data);

    // Validate approvers if provided
    if (data.approvers && data.approvers.length > 0) {
      await this.validateApprovers(data.companyId, data.approvers);
    }

    // Start transaction
    return await db.transaction(async (trx) => {
      // Create the approval rule
      const approvalRule = new ApprovalRule({
        company_id: data.companyId,
        name: data.name.trim(),
        rule_type: data.ruleType,
        percentage_threshold: data.percentageThreshold || null,
        specific_approver_id: data.specificApproverId || null,
        is_hybrid: data.isHybrid || false,
        priority: data.priority || 0,
      });

      // Validate the rule
      approvalRule.validate();

      // Save the rule
      const [savedRule] = await trx('approval_rules')
        .insert(approvalRule.toDatabase())
        .returning('*');

      const createdRule = ApprovalRule.fromDatabase(savedRule);

      // Create approvers if provided
      if (data.approvers && data.approvers.length > 0) {
        const approverPromises = data.approvers.map(async (approverData) => {
          const approver = new ApprovalRuleApprover({
            approval_rule_id: createdRule.id,
            approver_id: approverData.approverId,
            sequence: approverData.sequence,
          });

          return await trx('approval_rule_approvers')
            .insert(approver.toDatabase())
            .returning('*');
        });

        await Promise.all(approverPromises);
      }

      // Load approvers for the created rule
      await createdRule.loadApprovers();

      return createdRule;
    });
  }

  /**
   * Get approval rules by company ID
   * @param companyId - Company ID
   * @returns Promise<ApprovalRule[]> - Array of approval rules
   */
  public static async getApprovalRulesByCompany(companyId: string): Promise<ApprovalRule[]> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const rules = await ApprovalRule.findByCompanyId(companyId);

    // Load approvers for each rule
    await Promise.all(rules.map(rule => rule.loadApprovers()));

    return rules;
  }

  /**
   * Get approval rule by ID
   * @param id - Approval rule ID
   * @param companyId - Company ID for authorization
   * @returns Promise<ApprovalRule | null> - Approval rule or null
   */
  public static async getApprovalRuleById(id: string, companyId: string): Promise<ApprovalRule | null> {
    if (!id) {
      throw new Error('Approval rule ID is required');
    }

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const rule = await ApprovalRule.findById(id);

    if (!rule) {
      return null;
    }

    // Verify the rule belongs to the company
    if (rule.companyId !== companyId) {
      throw new Error('Approval rule not found or access denied');
    }

    // Load approvers
    await rule.loadApprovers();

    return rule;
  }

  /**
   * Update an approval rule
   * @param id - Approval rule ID
   * @param companyId - Company ID for authorization
   * @param data - Update data
   * @returns Promise<ApprovalRule> - Updated approval rule
   */
  public static async updateApprovalRule(
    id: string,
    companyId: string,
    data: UpdateApprovalRuleDTO
  ): Promise<ApprovalRule> {
    if (!id) {
      throw new Error('Approval rule ID is required');
    }

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Get existing rule
    const existingRule = await this.getApprovalRuleById(id, companyId);
    if (!existingRule) {
      throw new Error('Approval rule not found');
    }

    // Validate rule type specific requirements if rule type is being updated
    if (data.ruleType) {
      await this.validateRuleTypeRequirements(data.ruleType, {
        ...data,
        companyId,
        percentageThreshold: data.percentageThreshold ?? (existingRule.percentageThreshold || undefined),
        specificApproverId: data.specificApproverId ?? (existingRule.specificApproverId || undefined),
        isHybrid: data.isHybrid ?? existingRule.isHybrid,
      });
    }

    // Validate approvers if provided
    if (data.approvers && data.approvers.length > 0) {
      await this.validateApprovers(companyId, data.approvers);
    }

    // Start transaction
    return await db.transaction(async (trx) => {
      // Update the approval rule
      const updateData: Partial<ApprovalRule> = {};
      
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.ruleType !== undefined) updateData.ruleType = data.ruleType;
      if (data.percentageThreshold !== undefined) updateData.percentageThreshold = data.percentageThreshold;
      if (data.specificApproverId !== undefined) updateData.specificApproverId = data.specificApproverId;
      if (data.isHybrid !== undefined) updateData.isHybrid = data.isHybrid;
      if (data.priority !== undefined) updateData.priority = data.priority;

      // Apply updates to existing rule
      Object.assign(existingRule, updateData);
      existingRule.updatedAt = new Date();

      // Validate the updated rule
      existingRule.validate();

      // Update in database
      const [updatedRule] = await trx('approval_rules')
        .where('id', id)
        .update({
          ...existingRule.toDatabase(),
          updated_at: existingRule.updatedAt,
        })
        .returning('*');

      const rule = ApprovalRule.fromDatabase(updatedRule);

      // Update approvers if provided
      if (data.approvers !== undefined) {
        // Delete existing approvers
        await trx('approval_rule_approvers')
          .where('approval_rule_id', id)
          .del();

        // Create new approvers
        if (data.approvers.length > 0) {
          const approverPromises = data.approvers.map(async (approverData) => {
            const approver = new ApprovalRuleApprover({
              approval_rule_id: id,
              approver_id: approverData.approverId,
              sequence: approverData.sequence,
            });

            return await trx('approval_rule_approvers')
              .insert(approver.toDatabase())
              .returning('*');
          });

          await Promise.all(approverPromises);
        }
      }

      // Load approvers for the updated rule
      await rule.loadApprovers();

      return rule;
    });
  }

  /**
   * Delete an approval rule
   * @param id - Approval rule ID
   * @param companyId - Company ID for authorization
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteApprovalRule(id: string, companyId: string): Promise<boolean> {
    if (!id) {
      throw new Error('Approval rule ID is required');
    }

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Verify the rule exists and belongs to the company
    const existingRule = await this.getApprovalRuleById(id, companyId);
    if (!existingRule) {
      throw new Error('Approval rule not found');
    }

    // Check if the rule is being used in any pending approval requests
    const pendingRequests = await db('approval_requests')
      .join('expenses', 'approval_requests.expense_id', 'expenses.id')
      .where('expenses.status', 'PENDING')
      .andWhere('approval_requests.status', 'PENDING')
      .first();

    if (pendingRequests) {
      throw new Error('Cannot delete approval rule that is currently being used in pending approvals');
    }

    // Delete the rule (approvers will be deleted by CASCADE)
    const deleted = await ApprovalRule.deleteById(id);
    return deleted;
  }

  /**
   * Validate rule type specific requirements
   * @private
   */
  private static async validateRuleTypeRequirements(
    ruleType: ApprovalRuleType,
    data: Partial<CreateApprovalRuleDTO>
  ): Promise<void> {
    switch (ruleType) {
      case ApprovalRuleType.PERCENTAGE:
        if (!data.percentageThreshold || data.percentageThreshold < 1 || data.percentageThreshold > 100) {
          throw new Error('Percentage threshold must be between 1 and 100 for percentage-based rules');
        }
        break;

      case ApprovalRuleType.SPECIFIC_APPROVER:
        if (!data.specificApproverId) {
          throw new Error('Specific approver ID is required for specific approver rules');
        }
        // Validate that the approver exists and belongs to the company
        const approver = await User.findById(data.specificApproverId);
        if (!approver || approver.companyId !== data.companyId) {
          throw new Error('Specific approver not found or does not belong to the company');
        }
        break;

      case ApprovalRuleType.HYBRID:
        if (!data.percentageThreshold || data.percentageThreshold < 1 || data.percentageThreshold > 100) {
          throw new Error('Percentage threshold must be between 1 and 100 for hybrid rules');
        }
        if (!data.specificApproverId) {
          throw new Error('Specific approver ID is required for hybrid rules');
        }
        // Validate that the approver exists and belongs to the company
        const hybridApprover = await User.findById(data.specificApproverId);
        if (!hybridApprover || hybridApprover.companyId !== data.companyId) {
          throw new Error('Specific approver not found or does not belong to the company');
        }
        if (!data.isHybrid) {
          throw new Error('is_hybrid flag must be true for hybrid rules');
        }
        break;

      case ApprovalRuleType.SEQUENTIAL:
        // Sequential rules require approvers to be defined
        if (!data.approvers || data.approvers.length === 0) {
          throw new Error('Sequential rules require at least one approver');
        }
        break;

      default:
        throw new Error(`Invalid rule type: ${ruleType}`);
    }
  }

  /**
   * Validate approvers array
   * @private
   */
  private static async validateApprovers(
    companyId: string,
    approvers: Array<{ approverId: string; sequence: number }>
  ): Promise<void> {
    if (!approvers || approvers.length === 0) {
      return;
    }

    // Check for duplicate approver IDs
    const approverIds = approvers.map(a => a.approverId);
    const uniqueApproverIds = new Set(approverIds);
    if (approverIds.length !== uniqueApproverIds.size) {
      throw new Error('Duplicate approvers are not allowed');
    }

    // Check for duplicate sequences
    const sequences = approvers.map(a => a.sequence);
    const uniqueSequences = new Set(sequences);
    if (sequences.length !== uniqueSequences.size) {
      throw new Error('Duplicate sequence numbers are not allowed');
    }

    // Validate that all approvers exist and belong to the company
    const approverPromises = approvers.map(async (approverData) => {
      const user = await User.findById(approverData.approverId);
      if (!user) {
        throw new Error(`Approver with ID ${approverData.approverId} not found`);
      }
      if (user.companyId !== companyId) {
        throw new Error(`Approver with ID ${approverData.approverId} does not belong to the company`);
      }
      if (approverData.sequence < 1) {
        throw new Error('Sequence numbers must be positive integers starting from 1');
      }
    });

    await Promise.all(approverPromises);

    // Validate sequence numbers are consecutive starting from 1
    const sortedSequences = sequences.sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new Error('Sequence numbers must be consecutive starting from 1');
      }
    }
  }
}