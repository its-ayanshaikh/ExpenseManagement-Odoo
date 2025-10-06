import { v4 as uuidv4 } from 'uuid';
import { ApprovalRule as ApprovalRuleInterface, ApprovalRuleType } from '../types/database';
import { db } from '../config/database';
import { ApprovalRuleApprover } from './ApprovalRuleApprover';

export class ApprovalRule {
  public id: string;
  public companyId: string;
  public name: string;
  public ruleType: ApprovalRuleType;
  public percentageThreshold: number | null;
  public specificApproverId: string | null;
  public isHybrid: boolean;
  public isSequentialApproval: boolean;
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
    this.isSequentialApproval = data.is_sequential_approval || false;
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
      is_sequential_approval: this.isSequentialApproval,
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
      .merge([
        'name', 'rule_type', 'percentage_threshold', 'specific_approver_id',
        'is_hybrid', 'is_sequential_approval', 'priority', 'updated_at'
      ])
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
   * Load approvers for this approval rule
   * @returns Promise<void>
   */
  public async loadApprovers(): Promise<void> {
    this.approvers = await ApprovalRuleApprover.findByApprovalRuleId(this.id);
  }
}
