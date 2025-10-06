import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  requireApprovalRulePermission,
  enforceCompanyIsolation
} from '../middleware/authorization';
import { ApprovalRuleService } from '../services/ApprovalRuleService';

const router = Router();

// Apply authentication to all approval rule routes
router.use(authenticateToken);

// Validation interfaces
interface CreateApprovalRuleRequest {
  name: string;
  isSequentialApproval: boolean;
  priority?: number;
  approvers: {
    approverId: string;
    isRequired: boolean;
    sequence: number;
  }[];
}

interface UpdateApprovalRuleRequest {
  name?: string;
  isSequentialApproval?: boolean;
  priority?: number;
  approvers?: {
    approverId: string;
    isRequired: boolean;
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
      isSequentialApproval,
      priority, 
      approvers 
    }: CreateApprovalRuleRequest = req.body;

    // Validate required fields
    if (!name || isSequentialApproval === undefined || !approvers) {
      res.status(400).json({
        status: 'error',
        message: 'Name, isSequentialApproval, and approvers are required',
        code: 'MISSING_FIELDS',
        required: ['name', 'isSequentialApproval', 'approvers']
      });
      return;
    }

    // Validate approvers array
    if (!Array.isArray(approvers) || approvers.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one approver is required',
        code: 'MISSING_APPROVERS'
      });
      return;
    }

    // Validate each approver has required fields
    for (const approver of approvers) {
      if (!approver.approverId || typeof approver.isRequired !== 'boolean' || typeof approver.sequence !== 'number') {
        res.status(400).json({
          status: 'error',
          message: 'Each approver must have approverId, isRequired, and sequence',
          code: 'INVALID_APPROVER_FORMAT'
        });
        return;
      }
    }

    // Create approval rule using ApprovalRuleService
    const approvalRuleService = new ApprovalRuleService();
    const approvalRule = await approvalRuleService.createApprovalRule({
      companyId: req.user!.companyId,
      name,
      isSequentialApproval,
      priority: priority || 0,
      approvers
    });

    res.status(201).json({
      status: 'success',
      message: 'Approval rule created successfully',
      data: {
        approvalRule
      }
    });

  } catch (error) {
    console.error('Create approval rule error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('required') || 
          error.message.includes('approver') ||
          error.message.includes('sequence') ||
          error.message.includes('duplicate') ||
          error.message.includes('Manager') ||
          error.message.includes('Admin')) {
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
    const approvalRuleService = new ApprovalRuleService();
    const approvalRules = await approvalRuleService.getApprovalRulesByCompany(req.user!.companyId);

    res.status(200).json({
      status: 'success',
      message: 'Approval rules retrieved successfully',
      data: {
        approvalRules,
        count: approvalRules.length
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
    const approvalRuleService = new ApprovalRuleService();
    const approvalRule = await approvalRuleService.getApprovalRuleById(id);

    // Verify the rule belongs to the user's company
    if (approvalRule.companyId !== req.user!.companyId) {
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
        approvalRule
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
      isSequentialApproval,
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

    // Validate approvers if provided
    if (approvers) {
      if (!Array.isArray(approvers) || approvers.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one approver is required',
          code: 'MISSING_APPROVERS'
        });
        return;
      }

      // Validate each approver has required fields
      for (const approver of approvers) {
        if (!approver.approverId || typeof approver.isRequired !== 'boolean' || typeof approver.sequence !== 'number') {
          res.status(400).json({
            status: 'error',
            message: 'Each approver must have approverId, isRequired, and sequence',
            code: 'INVALID_APPROVER_FORMAT'
          });
          return;
        }
      }
    }

    // Update approval rule using ApprovalRuleService
    const approvalRuleService = new ApprovalRuleService();
    const updatedRule = await approvalRuleService.updateApprovalRule(id, {
      name,
      isSequentialApproval,
      priority,
      approvers
    });

    // Verify the rule belongs to the user's company
    if (updatedRule.companyId !== req.user!.companyId) {
      res.status(404).json({
        status: 'error',
        message: 'Approval rule not found',
        code: 'APPROVAL_RULE_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Approval rule updated successfully',
      data: {
        approvalRule: updatedRule
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
          error.message.includes('approver') ||
          error.message.includes('sequence') ||
          error.message.includes('duplicate') ||
          error.message.includes('Manager') ||
          error.message.includes('Admin')) {
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

    // Get the rule first to verify company ownership
    const approvalRuleService = new ApprovalRuleService();
    const rule = await approvalRuleService.getApprovalRuleById(id);

    // Verify the rule belongs to the user's company
    if (rule.companyId !== req.user!.companyId) {
      res.status(404).json({
        status: 'error',
        message: 'Approval rule not found',
        code: 'APPROVAL_RULE_NOT_FOUND'
      });
      return;
    }

    // Delete approval rule
    await approvalRuleService.deleteApprovalRule(id);

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