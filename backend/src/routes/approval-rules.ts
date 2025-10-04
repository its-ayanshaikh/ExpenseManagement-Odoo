import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  requireApprovalRulePermission,
  enforceCompanyIsolation,
  roleCheckers
} from '../middleware/authorization';
import { ApprovalRuleType } from '../types/database';
import { User } from '../models/User';
import { ApprovalRuleService } from '../services/ApprovalRuleService';

const router = Router();

// Apply authentication to all approval rule routes
router.use(authenticateToken);

// Validation interfaces
interface CreateApprovalRuleRequest {
  name: string;
  ruleType: ApprovalRuleType;
  percentageThreshold?: number;
  specificApproverId?: string;
  isHybrid?: boolean;
  priority: number;
  approvers?: {
    approverId: string;
    sequence: number;
  }[];
}

interface UpdateApprovalRuleRequest {
  name?: string;
  ruleType?: ApprovalRuleType;
  percentageThreshold?: number;
  specificApproverId?: string;
  isHybrid?: boolean;
  priority?: number;
  approvers?: {
    approverId: string;
    sequence: number;
  }[];
}

/**
 * POST /api/approval-rules
 * Create approval rule (Admin only)
 */
router.post('/', requireApprovalRulePermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      ruleType, 
      percentageThreshold, 
      specificApproverId, 
      isHybrid, 
      priority, 
      approvers 
    }: CreateApprovalRuleRequest = req.body;

    // Validate required fields
    if (!name || !ruleType || priority === undefined) {
      res.status(400).json({
        status: 'error',
        message: 'Name, ruleType, and priority are required',
        code: 'MISSING_FIELDS',
        required: ['name', 'ruleType', 'priority']
      });
      return;
    }

    // Validate rule type
    if (!Object.values(ApprovalRuleType).includes(ruleType)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid rule type',
        code: 'INVALID_RULE_TYPE',
        validTypes: Object.values(ApprovalRuleType)
      });
      return;
    }

    // Validate priority
    if (typeof priority !== 'number' || priority < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Priority must be a positive number',
        code: 'INVALID_PRIORITY'
      });
      return;
    }

    // Validate rule-specific requirements
    if (ruleType === ApprovalRuleType.PERCENTAGE || (isHybrid && ruleType === ApprovalRuleType.HYBRID)) {
      if (!percentageThreshold || percentageThreshold < 1 || percentageThreshold > 100) {
        res.status(400).json({
          status: 'error',
          message: 'Percentage threshold must be between 1 and 100 for percentage-based rules',
          code: 'INVALID_PERCENTAGE_THRESHOLD'
        });
        return;
      }
    }

    if (ruleType === ApprovalRuleType.SPECIFIC_APPROVER || (isHybrid && ruleType === ApprovalRuleType.HYBRID)) {
      if (!specificApproverId) {
        res.status(400).json({
          status: 'error',
          message: 'Specific approver ID is required for specific approver rules',
          code: 'MISSING_SPECIFIC_APPROVER'
        });
        return;
      }

      // Validate that the specific approver exists and belongs to the same company
      const specificApprover = await User.findById(specificApproverId);
      if (!specificApprover) {
        res.status(400).json({
          status: 'error',
          message: 'Specific approver not found',
          code: 'SPECIFIC_APPROVER_NOT_FOUND'
        });
        return;
      }

      if (!roleCheckers.belongsToCompany(specificApprover, req.user!.companyId)) {
        res.status(400).json({
          status: 'error',
          message: 'Specific approver must belong to the same company',
          code: 'SPECIFIC_APPROVER_COMPANY_MISMATCH'
        });
        return;
      }

      if (!roleCheckers.isAdminOrManager(specificApprover)) {
        res.status(400).json({
          status: 'error',
          message: 'Specific approver must have Admin or Manager role',
          code: 'INVALID_SPECIFIC_APPROVER_ROLE'
        });
        return;
      }
    }

    if (ruleType === ApprovalRuleType.SEQUENTIAL) {
      if (!approvers || approvers.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Approvers list is required for sequential rules',
          code: 'MISSING_APPROVERS'
        });
        return;
      }

      // Validate approvers
      for (const approver of approvers) {
        if (!approver.approverId || typeof approver.sequence !== 'number') {
          res.status(400).json({
            status: 'error',
            message: 'Each approver must have approverId and sequence',
            code: 'INVALID_APPROVER_FORMAT'
          });
          return;
        }

        // Validate that approver exists and belongs to the same company
        const approverUser = await User.findById(approver.approverId);
        if (!approverUser) {
          res.status(400).json({
            status: 'error',
            message: `Approver with ID ${approver.approverId} not found`,
            code: 'APPROVER_NOT_FOUND'
          });
          return;
        }

        if (!roleCheckers.belongsToCompany(approverUser, req.user!.companyId)) {
          res.status(400).json({
            status: 'error',
            message: `Approver ${approver.approverId} must belong to the same company`,
            code: 'APPROVER_COMPANY_MISMATCH'
          });
          return;
        }

        if (!roleCheckers.isAdminOrManager(approverUser)) {
          res.status(400).json({
            status: 'error',
            message: `Approver ${approver.approverId} must have Admin or Manager role`,
            code: 'INVALID_APPROVER_ROLE'
          });
          return;
        }
      }

      // Check for duplicate sequences
      const sequences = approvers.map(a => a.sequence);
      const uniqueSequences = new Set(sequences);
      if (sequences.length !== uniqueSequences.size) {
        res.status(400).json({
          status: 'error',
          message: 'Approver sequences must be unique',
          code: 'DUPLICATE_SEQUENCES'
        });
        return;
      }
    }

    // Create approval rule using ApprovalRuleService
    const approvalRule = await ApprovalRuleService.createApprovalRule({
      companyId: req.user!.companyId,
      name,
      ruleType,
      percentageThreshold,
      specificApproverId,
      isHybrid: isHybrid || false,
      priority,
      approvers
    });

    res.status(201).json({
      status: 'success',
      message: 'Approval rule created successfully',
      data: {
        approvalRule: {
          id: approvalRule.id,
          companyId: approvalRule.companyId,
          name: approvalRule.name,
          ruleType: approvalRule.ruleType,
          percentageThreshold: approvalRule.percentageThreshold,
          specificApproverId: approvalRule.specificApproverId,
          isHybrid: approvalRule.isHybrid,
          priority: approvalRule.priority,
          approvers: approvalRule.approvers?.map(a => ({
            id: a.id,
            approverId: a.approverId,
            sequence: a.sequence
          })) || [],
          createdAt: approvalRule.createdAt,
          updatedAt: approvalRule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create approval rule error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('required') || 
          error.message.includes('threshold') || 
          error.message.includes('approver') ||
          error.message.includes('sequence')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during approval rule creation',
      code: 'APPROVAL_RULE_CREATION_ERROR'
    });
  }
});

/**
 * GET /api/approval-rules
 * List approval rules (Admin only)
 */
router.get('/', requireApprovalRulePermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get approval rules for the company
    const approvalRules = await ApprovalRuleService.getApprovalRulesByCompany(req.user!.companyId);

    const formattedRules = approvalRules.map(rule => ({
      id: rule.id,
      companyId: rule.companyId,
      name: rule.name,
      ruleType: rule.ruleType,
      percentageThreshold: rule.percentageThreshold,
      specificApproverId: rule.specificApproverId,
      isHybrid: rule.isHybrid,
      priority: rule.priority,
      approvers: rule.approvers?.map(a => ({
        id: a.id,
        approverId: a.approverId,
        sequence: a.sequence
      })) || [],
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }));

    res.status(200).json({
      status: 'success',
      message: 'Approval rules retrieved successfully',
      data: {
        approvalRules: formattedRules,
        count: formattedRules.length
      }
    });

  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving approval rules',
      code: 'GET_APPROVAL_RULES_ERROR'
    });
  }
});

/**
 * GET /api/approval-rules/:id
 * Get approval rule details (Admin only)
 */
router.get('/:id', requireApprovalRulePermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Approval rule ID is required',
        code: 'MISSING_RULE_ID'
      });
      return;
    }

    // Get approval rule by ID
    const approvalRule = await ApprovalRuleService.getApprovalRuleById(id, req.user!.companyId);

    if (!approvalRule) {
      res.status(404).json({
        status: 'error',
        message: 'Approval rule not found',
        code: 'APPROVAL_RULE_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Approval rule retrieved successfully',
      data: {
        approvalRule: {
          id: approvalRule.id,
          companyId: approvalRule.companyId,
          name: approvalRule.name,
          ruleType: approvalRule.ruleType,
          percentageThreshold: approvalRule.percentageThreshold,
          specificApproverId: approvalRule.specificApproverId,
          isHybrid: approvalRule.isHybrid,
          priority: approvalRule.priority,
          approvers: approvalRule.approvers?.map(a => ({
            id: a.id,
            approverId: a.approverId,
            sequence: a.sequence
          })) || [],
          createdAt: approvalRule.createdAt,
          updatedAt: approvalRule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get approval rule error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        status: 'error',
        message: 'Approval rule not found',
        code: 'APPROVAL_RULE_NOT_FOUND'
      });
      return;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving approval rule',
      code: 'GET_APPROVAL_RULE_ERROR'
    });
  }
});

/**
 * PUT /api/approval-rules/:id
 * Update approval rule (Admin only)
 */
router.put('/:id', requireApprovalRulePermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      ruleType, 
      percentageThreshold, 
      specificApproverId, 
      isHybrid, 
      priority, 
      approvers 
    }: UpdateApprovalRuleRequest = req.body;

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Approval rule ID is required',
        code: 'MISSING_RULE_ID'
      });
      return;
    }

    // Validate rule type if provided
    if (ruleType && !Object.values(ApprovalRuleType).includes(ruleType)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid rule type',
        code: 'INVALID_RULE_TYPE',
        validTypes: Object.values(ApprovalRuleType)
      });
      return;
    }

    // Validate priority if provided
    if (priority !== undefined && (typeof priority !== 'number' || priority < 1)) {
      res.status(400).json({
        status: 'error',
        message: 'Priority must be a positive number',
        code: 'INVALID_PRIORITY'
      });
      return;
    }

    // Validate rule-specific requirements if rule type is being updated
    if (ruleType === ApprovalRuleType.PERCENTAGE || (isHybrid && ruleType === ApprovalRuleType.HYBRID)) {
      if (percentageThreshold !== undefined && (percentageThreshold < 1 || percentageThreshold > 100)) {
        res.status(400).json({
          status: 'error',
          message: 'Percentage threshold must be between 1 and 100 for percentage-based rules',
          code: 'INVALID_PERCENTAGE_THRESHOLD'
        });
        return;
      }
    }

    if (ruleType === ApprovalRuleType.SPECIFIC_APPROVER || (isHybrid && ruleType === ApprovalRuleType.HYBRID)) {
      if (specificApproverId) {
        // Validate that the specific approver exists and belongs to the same company
        const specificApprover = await User.findById(specificApproverId);
        if (!specificApprover) {
          res.status(400).json({
            status: 'error',
            message: 'Specific approver not found',
            code: 'SPECIFIC_APPROVER_NOT_FOUND'
          });
          return;
        }

        if (!roleCheckers.belongsToCompany(specificApprover, req.user!.companyId)) {
          res.status(400).json({
            status: 'error',
            message: 'Specific approver must belong to the same company',
            code: 'SPECIFIC_APPROVER_COMPANY_MISMATCH'
          });
          return;
        }

        if (!roleCheckers.isAdminOrManager(specificApprover)) {
          res.status(400).json({
            status: 'error',
            message: 'Specific approver must have Admin or Manager role',
            code: 'INVALID_SPECIFIC_APPROVER_ROLE'
          });
          return;
        }
      }
    }

    if (ruleType === ApprovalRuleType.SEQUENTIAL && approvers) {
      if (approvers.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Approvers list cannot be empty for sequential rules',
          code: 'EMPTY_APPROVERS'
        });
        return;
      }

      // Validate approvers
      for (const approver of approvers) {
        if (!approver.approverId || typeof approver.sequence !== 'number') {
          res.status(400).json({
            status: 'error',
            message: 'Each approver must have approverId and sequence',
            code: 'INVALID_APPROVER_FORMAT'
          });
          return;
        }

        // Validate that approver exists and belongs to the same company
        const approverUser = await User.findById(approver.approverId);
        if (!approverUser) {
          res.status(400).json({
            status: 'error',
            message: `Approver with ID ${approver.approverId} not found`,
            code: 'APPROVER_NOT_FOUND'
          });
          return;
        }

        if (!roleCheckers.belongsToCompany(approverUser, req.user!.companyId)) {
          res.status(400).json({
            status: 'error',
            message: `Approver ${approver.approverId} must belong to the same company`,
            code: 'APPROVER_COMPANY_MISMATCH'
          });
          return;
        }

        if (!roleCheckers.isAdminOrManager(approverUser)) {
          res.status(400).json({
            status: 'error',
            message: `Approver ${approver.approverId} must have Admin or Manager role`,
            code: 'INVALID_APPROVER_ROLE'
          });
          return;
        }
      }

      // Check for duplicate sequences
      const sequences = approvers.map(a => a.sequence);
      const uniqueSequences = new Set(sequences);
      if (sequences.length !== uniqueSequences.size) {
        res.status(400).json({
          status: 'error',
          message: 'Approver sequences must be unique',
          code: 'DUPLICATE_SEQUENCES'
        });
        return;
      }
    }

    // Update approval rule using ApprovalRuleService
    const updatedRule = await ApprovalRuleService.updateApprovalRule(id, req.user!.companyId, {
      name,
      ruleType,
      percentageThreshold,
      specificApproverId,
      isHybrid,
      priority,
      approvers
    });

    res.status(200).json({
      status: 'success',
      message: 'Approval rule updated successfully',
      data: {
        approvalRule: {
          id: updatedRule.id,
          companyId: updatedRule.companyId,
          name: updatedRule.name,
          ruleType: updatedRule.ruleType,
          percentageThreshold: updatedRule.percentageThreshold,
          specificApproverId: updatedRule.specificApproverId,
          isHybrid: updatedRule.isHybrid,
          priority: updatedRule.priority,
          approvers: updatedRule.approvers?.map(a => ({
            id: a.id,
            approverId: a.approverId,
            sequence: a.sequence
          })) || [],
          createdAt: updatedRule.createdAt,
          updatedAt: updatedRule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update approval rule error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: 'Approval rule not found',
          code: 'APPROVAL_RULE_NOT_FOUND'
        });
        return;
      }
      
      if (error.message.includes('required') || 
          error.message.includes('threshold') || 
          error.message.includes('approver') ||
          error.message.includes('sequence')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during approval rule update',
      code: 'APPROVAL_RULE_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/approval-rules/:id
 * Delete approval rule (Admin only)
 */
router.delete('/:id', requireApprovalRulePermission, enforceCompanyIsolation, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Approval rule ID is required',
        code: 'MISSING_RULE_ID'
      });
      return;
    }

    // Delete approval rule using ApprovalRuleService
    const deleted = await ApprovalRuleService.deleteApprovalRule(id, req.user!.companyId);

    if (!deleted) {
      res.status(404).json({
        status: 'error',
        message: 'Approval rule not found',
        code: 'APPROVAL_RULE_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Approval rule deleted successfully',
      data: {
        deletedRuleId: id
      }
    });

  } catch (error) {
    console.error('Delete approval rule error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: 'Approval rule not found',
          code: 'APPROVAL_RULE_NOT_FOUND'
        });
        return;
      }
      
      if (error.message.includes('pending approvals')) {
        res.status(409).json({
          status: 'error',
          message: 'Cannot delete approval rule that is currently being used in pending approvals',
          code: 'APPROVAL_RULE_IN_USE'
        });
        return;
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during approval rule deletion',
      code: 'APPROVAL_RULE_DELETE_ERROR'
    });
  }
});

export default router;