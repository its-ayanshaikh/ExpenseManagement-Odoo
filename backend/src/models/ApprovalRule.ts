import { v4 as uuidv4 } from 'uuid';
import { ApprovalRule as ApprovalRuleInterface, ApprovalRuleApprover as ApprovalRuleApproverInterface, ApprovalRuleType } from '../types/database';
import { db } from '../config/database';

export class ApprovalRule {
  public id: string;
  public companyId: string;
  public name: string;
  public ruleType: ApprovalRuleType;
  public percentageThreshold: number | null;
  public specificApproverId: string | null;
  public isHybrid: boolean;
  public priority: number;
  public createdAt: Date;
  public updatedAt: Date;
  public approvers?: ApprovalRuleApprover[];

  constructor(data: Partial<ApprovalRuleInterface>) {
    this.id = data.id || uuidv4();
    this.companyId = data.company_id || '';
    this.name = data.name || '';
    this.ruleType = data.rule_type || ApprovalRuleType.SEQUENTIAL;
    this.percentageThreshold = data.percentage_threshold || null;
    this.specificApproverId = data.specific_approver_id || null;
    this.isHybrid = data.is_hybrid || false;
    this.priority = data.priority || 0;
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  /**
   * Convert ApprovalRule instance to database format
   * @returns ApprovalRuleInterface - Database format object
   */
  public toDatabase(): ApprovalRuleInterface {
    return {
      id: this.id,
      company_id: this.companyId,
      name: this.name,
      rule_type: this.ruleType,
      percentage_threshold: this.percentageThreshold,
      specific_approver_id: this.specificApproverId,
      is_hybrid: this.isHybrid,
      priority: this.priority,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Create ApprovalRule from database row
   * @param row - Database row
   * @returns ApprovalRule - ApprovalRule instance
   */
  public static fromDatabase(row: ApprovalRuleInterface): ApprovalRule {
    return new ApprovalRule(row);
  }

  /**
   * Save approval rule to database
   * @returns Promise<ApprovalRule> - Saved approval rule instance
   */
  public async save(): Promise<ApprovalRule> {
    this.updatedAt = new Date();
    const ruleData = this.toDatabase();
    
    const [savedRule] = await db('approval_rules')
      .insert(ruleData)
      .onConflict('id')
      .merge(['name', 'rule_type', 'percentage_threshold', 'specific_approver_id', 'is_hybrid', 'priority', 'updated_at'])
      .returning('*');
    
    return ApprovalRule.fromDatabase(savedRule);
  }

  /**
   * Find approval rule by ID
   * @param id - Approval rule ID
   * @returns Promise<ApprovalRule | null> - ApprovalRule instance or null
   */
  public static async findById(id: string): Promise<ApprovalRule | null> {
    const rule = await db('approval_rules').where('id', id).first();
    return rule ? ApprovalRule.fromDatabase(rule) : null;
  }

  /**
   * Find approval rules by company ID
   * @param companyId - Company ID
   * @returns Promise<ApprovalRule[]> - Array of approval rule instances
   */
  public static async findByCompanyId(companyId: string): Promise<ApprovalRule[]> {
    const rules = await db('approval_rules')
      .where('company_id', companyId)
      .orderBy('priority', 'asc');
    return rules.map(rule => ApprovalRule.fromDatabase(rule));
  }

  /**
   * Delete approval rule by ID
   * @param id - Approval rule ID
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await db('approval_rules').where('id', id).del();
    return deletedCount > 0;
  }

  /**
   * Load approvers for this rule
   * @returns Promise<void>
   */
  public async loadApprovers(): Promise<void> {
    const approvers = await db('approval_rule_approvers')
      .where('approval_rule_id', this.id)
      .orderBy('sequence', 'asc');
    
    this.approvers = approvers.map(approver => ApprovalRuleApprover.fromDatabase(approver));
  }

  /**
   * Validate rule configuration
   * @throws Error if validation fails
   */
  public validate(): void {
    if (!this.name.trim()) {
      throw new Error('Rule name is required');
    }

    if (!this.companyId) {
      throw new Error('Company ID is required');
    }

    // Validate percentage threshold for percentage-based rules
    if (this.ruleType === ApprovalRuleType.PERCENTAGE || this.isHybrid) {
      if (this.percentageThreshold === null || this.percentageThreshold === undefined) {
        throw new Error('Percentage threshold is required for percentage-based rules');
      }
      if (this.percentageThreshold < 1 || this.percentageThreshold > 100) {
        throw new Error('Percentage threshold must be between 1 and 100');
      }
    }

    // Validate specific approver for specific approver rules
    if (this.ruleType === ApprovalRuleType.SPECIFIC_APPROVER || this.isHybrid) {
      if (!this.specificApproverId) {
        throw new Error('Specific approver ID is required for specific approver rules');
      }
    }

    // Validate hybrid rules
    if (this.isHybrid && this.ruleType !== ApprovalRuleType.HYBRID) {
      throw new Error('is_hybrid flag can only be true for HYBRID rule type');
    }

    if (this.ruleType === ApprovalRuleType.HYBRID && !this.isHybrid) {
      throw new Error('HYBRID rule type requires is_hybrid flag to be true');
    }

    // Validate priority
    if (this.priority < 0) {
      throw new Error('Priority must be a non-negative number');
    }
  }
}

export class ApprovalRuleApprover {
  public id: string;
  public approvalRuleId: string;
  public approverId: string;
  public sequence: number;
  public createdAt: Date;

  constructor(data: Partial<ApprovalRuleApproverInterface>) {
    this.id = data.id || uuidv4();
    this.approvalRuleId = data.approval_rule_id || '';
    this.approverId = data.approver_id || '';
    this.sequence = data.sequence || 0;
    this.createdAt = data.created_at || new Date();
  }

  /**
   * Convert ApprovalRuleApprover instance to database format
   * @returns ApprovalRuleApproverInterface - Database format object
   */
  public toDatabase(): ApprovalRuleApproverInterface {
    return {
      id: this.id,
      approval_rule_id: this.approvalRuleId,
      approver_id: this.approverId,
      sequence: this.sequence,
      created_at: this.createdAt,
    };
  }

  /**
   * Create ApprovalRuleApprover from database row
   * @param row - Database row
   * @returns ApprovalRuleApprover - ApprovalRuleApprover instance
   */
  public static fromDatabase(row: ApprovalRuleApproverInterface): ApprovalRuleApprover {
    return new ApprovalRuleApprover(row);
  }

  /**
   * Save approval rule approver to database
   * @returns Promise<ApprovalRuleApprover> - Saved approval rule approver instance
   */
  public async save(): Promise<ApprovalRuleApprover> {
    const approverData = this.toDatabase();
    
    const [savedApprover] = await db('approval_rule_approvers')
      .insert(approverData)
      .onConflict('id')
      .merge(['approver_id', 'sequence'])
      .returning('*');
    
    return ApprovalRuleApprover.fromDatabase(savedApprover);
  }

  /**
   * Find approval rule approvers by rule ID
   * @param approvalRuleId - Approval rule ID
   * @returns Promise<ApprovalRuleApprover[]> - Array of approval rule approver instances
   */
  public static async findByApprovalRuleId(approvalRuleId: string): Promise<ApprovalRuleApprover[]> {
    const approvers = await db('approval_rule_approvers')
      .where('approval_rule_id', approvalRuleId)
      .orderBy('sequence', 'asc');
    return approvers.map(approver => ApprovalRuleApprover.fromDatabase(approver));
  }

  /**
   * Delete approval rule approvers by rule ID
   * @param approvalRuleId - Approval rule ID
   * @returns Promise<number> - Number of deleted records
   */
  public static async deleteByApprovalRuleId(approvalRuleId: string): Promise<number> {
    return await db('approval_rule_approvers').where('approval_rule_id', approvalRuleId).del();
  }
}