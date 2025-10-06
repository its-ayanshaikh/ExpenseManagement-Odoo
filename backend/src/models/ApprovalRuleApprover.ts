import { v4 as uuidv4 } from 'uuid';
import { ApprovalRuleApprover as ApprovalRuleApproverInterface } from '../types/database';
import { db } from '../config/database';

export class ApprovalRuleApprover {
  public id: string;
  public approvalRuleId: string;
  public approverId: string;
  public isRequired: boolean;
  public sequence: number;
  public createdAt: Date;

  constructor(data: Partial<ApprovalRuleApproverInterface>) {
    this.id = data.id || uuidv4();
    this.approvalRuleId = data.approval_rule_id || '';
    this.approverId = data.approver_id || '';
    this.isRequired = data.is_required || false;
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
      is_required: this.isRequired,
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
      .merge(['approver_id', 'is_required', 'sequence'])
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
    return await db('approval_rule_approvers')
      .where('approval_rule_id', approvalRuleId)
      .del();
  }

  /**
   * Delete approval rule approver by ID
   * @param id - Approval rule approver ID
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await db('approval_rule_approvers').where('id', id).del();
    return deletedCount > 0;
  }
}
