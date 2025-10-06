import { ApprovalRule } from '../models/ApprovalRule';
import { ApprovalRuleApprover } from '../models/ApprovalRuleApprover';
import { User } from '../models/User';
import { ApprovalRuleType, UserRole } from '../types/database';
import { db } from '../config/database';

export interface CreateApprovalRuleDTO {
  companyId: string;
  name: string;
  ruleType?: ApprovalRuleType;
  isSequentialApproval: boolean;
  approvers: {
    approverId: string;
    isRequired: boolean;
    sequence: number;
  }[];
  priority?: number;
}

export interface UpdateApprovalRuleDTO {
  name?: string;
  isSequentialApproval?: boolean;
  approvers?: {
    approverId: string;
    isRequired: boolean;
    sequence: number;
  }[];
  priority?: number;
}

export interface ApprovalRuleWithApprovers {
  id: string;
  companyId: string;
  name: string;
  ruleType: ApprovalRuleType;
  isSequentialApproval: boolean;
  priority: number;
  approvers: {
    id: string;
    approverId: string;
    approverName: string;
    approverEmail: string;
    isRequired: boolean;
    sequence: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class ApprovalRuleService {
  /**
   * Create a new approval rule with approvers
   * @param data - Approval rule creation data
   * @returns Promise<ApprovalRuleWithApprovers> - Created approval rule with approvers
   */
  async createApprovalRule(data: CreateApprovalRuleDTO): Promise<ApprovalRuleWithApprovers> {
    // Validate approvers
    await this.validateApprovers(data.companyId, data.approvers);

    // Validate sequences if sequential approval is enabled
    if (data.isSequentialApproval) {
      this.validateSequences(data.approvers);
    }

    // Create approval rule
    const approvalRule = new ApprovalRule({
      company_id: data.companyId,
      name: data.name,
      rule_type: data.ruleType || ApprovalRuleType.SEQUENTIAL,
      is_sequential_approval: data.isSequentialApproval,
      priority: data.priority || 0,
    });

    const savedRule = await approvalRule.save();

    // Create approval rule approvers
    const approverPromises = data.approvers.map(async (approver) => {
      const ruleApprover = new ApprovalRuleApprover({
        approval_rule_id: savedRule.id,
        approver_id: approver.approverId,
        is_required: approver.isRequired,
        sequence: approver.sequence,
      });
      return ruleApprover.save();
    });

    await Promise.all(approverPromises);

    // Return the complete rule with approvers
    return this.getApprovalRuleById(savedRule.id);
  }

  /**
   * Get approval rule by ID with approvers
   * @param id - Approval rule ID
   * @returns Promise<ApprovalRuleWithApprovers> - Approval rule with approvers
   */
  async getApprovalRuleById(id: string): Promise<ApprovalRuleWithApprovers> {
    const rule = await ApprovalRule.findById(id);
    if (!rule) {
      throw new Error('Approval rule not found');
    }

    const approvers = await ApprovalRuleApprover.findByApprovalRuleId(id);
    
    // Get approver details
    const approverDetails = await Promise.all(
      approvers.map(async (approver) => {
        const user = await User.findById(approver.approverId);
        return {
          id: approver.id,
          approverId: approver.approverId,
          approverName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          approverEmail: user ? user.email : '',
          isRequired: approver.isRequired,
          sequence: approver.sequence,
        };
      })
    );

    return {
      id: rule.id,
      companyId: rule.companyId,
      name: rule.name,
      ruleType: rule.ruleType,
      isSequentialApproval: rule.isSequentialApproval,
      priority: rule.priority,
      approvers: approverDetails,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  /**
   * Get all approval rules for a company
   * @param companyId - Company ID
   * @returns Promise<ApprovalRuleWithApprovers[]> - Array of approval rules with approvers
   */
  async getApprovalRulesByCompany(companyId: string): Promise<ApprovalRuleWithApprovers[]> {
    const rules = await ApprovalRule.findByCompanyId(companyId);
    
    const rulesWithApprovers = await Promise.all(
      rules.map(async (rule) => {
        return this.getApprovalRuleById(rule.id);
      })
    );

    return rulesWithApprovers;
  }

  /**
   * Update an approval rule
   * @param id - Approval rule ID
   * @param data - Update data
   * @returns Promise<ApprovalRuleWithApprovers> - Updated approval rule with approvers
   */
  async updateApprovalRule(id: string, data: UpdateApprovalRuleDTO): Promise<ApprovalRuleWithApprovers> {
    const rule = await ApprovalRule.findById(id);
    if (!rule) {
      throw new Error('Approval rule not found');
    }

    // Update rule fields
    if (data.name !== undefined) {
      rule.name = data.name;
    }
    if (data.isSequentialApproval !== undefined) {
      rule.isSequentialApproval = data.isSequentialApproval;
    }
    if (data.priority !== undefined) {
      rule.priority = data.priority;
    }

    await rule.save();

    // Update approvers if provided
    if (data.approvers) {
      // Validate approvers
      await this.validateApprovers(rule.companyId, data.approvers);

      // Validate sequences if sequential approval is enabled
      if (rule.isSequentialApproval) {
        this.validateSequences(data.approvers);
      }

      // Delete existing approvers
      await ApprovalRuleApprover.deleteByApprovalRuleId(id);

      // Create new approvers
      const approverPromises = data.approvers.map(async (approver) => {
        const ruleApprover = new ApprovalRuleApprover({
          approval_rule_id: id,
          approver_id: approver.approverId,
          is_required: approver.isRequired,
          sequence: approver.sequence,
        });
        return ruleApprover.save();
      });

      await Promise.all(approverPromises);
    }

    return this.getApprovalRuleById(id);
  }

  /**
   * Delete an approval rule
   * @param id - Approval rule ID
   * @returns Promise<void>
   */
  async deleteApprovalRule(id: string): Promise<void> {
    const rule = await ApprovalRule.findById(id);
    if (!rule) {
      throw new Error('Approval rule not found');
    }

    // Delete approvers first (cascade should handle this, but being explicit)
    await ApprovalRuleApprover.deleteByApprovalRuleId(id);

    // Delete the rule
    await ApprovalRule.deleteById(id);
  }

  /**
   * Validate approvers exist and are managers in the company
   * @param companyId - Company ID
   * @param approvers - Array of approvers to validate
   * @throws Error if validation fails
   */
  private async validateApprovers(
    companyId: string,
    approvers: { approverId: string; isRequired: boolean; sequence: number }[]
  ): Promise<void> {
    if (!approvers || approvers.length === 0) {
      throw new Error('At least one approver is required');
    }

    // Check for duplicate approvers
    const approverIds = approvers.map(a => a.approverId);
    const uniqueApproverIds = new Set(approverIds);
    if (approverIds.length !== uniqueApproverIds.size) {
      throw new Error('Duplicate approvers are not allowed');
    }

    // Validate each approver
    for (const approver of approvers) {
      const user = await User.findById(approver.approverId);
      
      if (!user) {
        throw new Error(`Approver with ID ${approver.approverId} not found`);
      }

      if (user.companyId !== companyId) {
        throw new Error(`Approver ${approver.approverId} does not belong to the company`);
      }

      if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
        throw new Error(`User ${approver.approverId} must be a Manager or Admin to be an approver`);
      }
    }
  }

  /**
   * Validate sequence numbers are unique and sequential
   * @param approvers - Array of approvers with sequences
   * @throws Error if validation fails
   */
  private validateSequences(
    approvers: { approverId: string; isRequired: boolean; sequence: number }[]
  ): void {
    const sequences = approvers.map(a => a.sequence);
    const uniqueSequences = new Set(sequences);

    if (sequences.length !== uniqueSequences.size) {
      throw new Error('Sequence numbers must be unique');
    }

    // Check that sequences start from 1 and are consecutive
    const sortedSequences = [...sequences].sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new Error('Sequence numbers must start from 1 and be consecutive');
      }
    }
  }

  /**
   * Get required approvers for a company
   * @param companyId - Company ID
   * @returns Promise<User[]> - Array of required approvers
   */
  async getRequiredApprovers(companyId: string): Promise<User[]> {
    const rules = await this.getApprovalRulesByCompany(companyId);
    
    if (rules.length === 0) {
      return [];
    }

    // Get the first rule (assuming one rule per company for now)
    const rule = rules[0];
    const requiredApproverIds = rule.approvers
      .filter(a => a.isRequired)
      .map(a => a.approverId);

    const approvers = await Promise.all(
      requiredApproverIds.map(id => User.findById(id))
    );

    return approvers.filter((user): user is User => user !== null);
  }

  /**
   * Check if sequential approval is enabled for a company
   * @param companyId - Company ID
   * @returns Promise<boolean> - True if sequential approval is enabled
   */
  async isSequentialApprovalEnabled(companyId: string): Promise<boolean> {
    const rules = await this.getApprovalRulesByCompany(companyId);
    
    if (rules.length === 0) {
      return false;
    }

    // Get the first rule (assuming one rule per company for now)
    return rules[0].isSequentialApproval;
  }
}
