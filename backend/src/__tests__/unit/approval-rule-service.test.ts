import { ApprovalRuleService } from '../../services/ApprovalRuleService';
import { ApprovalRule } from '../../models/ApprovalRule';
import { ApprovalRuleApprover } from '../../models/ApprovalRuleApprover';
import { User } from '../../models/User';
import { UserRole } from '../../types/database';

// Mock the models
jest.mock('../../models/ApprovalRule');
jest.mock('../../models/ApprovalRuleApprover');
jest.mock('../../models/User');

describe('ApprovalRuleService', () => {
  let service: ApprovalRuleService;

  beforeEach(() => {
    service = new ApprovalRuleService();
    jest.clearAllMocks();
  });

  describe('createApprovalRule', () => {
    it('should create an approval rule with approvers', async () => {
      const mockUser = {
        id: 'user-1',
        companyId: 'company-1',
        role: UserRole.MANAGER,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
      };

      const mockRule = {
        id: 'rule-1',
        companyId: 'company-1',
        name: 'Test Rule',
        isSequentialApproval: true,
        priority: 1,
        save: jest.fn().mockResolvedValue({
          id: 'rule-1',
          companyId: 'company-1',
          name: 'Test Rule',
          isSequentialApproval: true,
          priority: 1,
        }),
      };

      const mockApprover = {
        id: 'approver-1',
        approvalRuleId: 'rule-1',
        approverId: 'user-1',
        isRequired: true,
        sequence: 1,
        save: jest.fn().mockResolvedValue({
          id: 'approver-1',
          approvalRuleId: 'rule-1',
          approverId: 'user-1',
          isRequired: true,
          sequence: 1,
        }),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (ApprovalRule.prototype.save as jest.Mock).mockResolvedValue(mockRule);
      (ApprovalRuleApprover.prototype.save as jest.Mock).mockResolvedValue(mockApprover);
      (ApprovalRuleApprover.findByApprovalRuleId as jest.Mock).mockResolvedValue([mockApprover]);
      (ApprovalRule.findById as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.createApprovalRule({
        companyId: 'company-1',
        name: 'Test Rule',
        isSequentialApproval: true,
        priority: 1,
        approvers: [
          {
            approverId: 'user-1',
            isRequired: true,
            sequence: 1,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Rule');
      expect(result.isSequentialApproval).toBe(true);
    });

    it('should throw error if no approvers provided', async () => {
      await expect(
        service.createApprovalRule({
          companyId: 'company-1',
          name: 'Test Rule',
          isSequentialApproval: true,
          priority: 1,
          approvers: [],
        })
      ).rejects.toThrow('At least one approver is required');
    });

    it('should throw error for duplicate approvers', async () => {
      const mockUser = {
        id: 'user-1',
        companyId: 'company-1',
        role: UserRole.MANAGER,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.createApprovalRule({
          companyId: 'company-1',
          name: 'Test Rule',
          isSequentialApproval: true,
          priority: 1,
          approvers: [
            {
              approverId: 'user-1',
              isRequired: true,
              sequence: 1,
            },
            {
              approverId: 'user-1',
              isRequired: true,
              sequence: 2,
            },
          ],
        })
      ).rejects.toThrow('Duplicate approvers are not allowed');
    });

    it('should throw error if approver is not a manager or admin', async () => {
      const mockUser = {
        id: 'user-1',
        companyId: 'company-1',
        role: UserRole.EMPLOYEE,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.createApprovalRule({
          companyId: 'company-1',
          name: 'Test Rule',
          isSequentialApproval: true,
          priority: 1,
          approvers: [
            {
              approverId: 'user-1',
              isRequired: true,
              sequence: 1,
            },
          ],
        })
      ).rejects.toThrow('must be a Manager or Admin to be an approver');
    });

    it('should validate sequence numbers for sequential approval', async () => {
      const mockUser = {
        id: 'user-1',
        companyId: 'company-1',
        role: UserRole.MANAGER,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.createApprovalRule({
          companyId: 'company-1',
          name: 'Test Rule',
          isSequentialApproval: true,
          priority: 1,
          approvers: [
            {
              approverId: 'user-1',
              isRequired: true,
              sequence: 1,
            },
            {
              approverId: 'user-2',
              isRequired: true,
              sequence: 1, // Duplicate sequence
            },
          ],
        })
      ).rejects.toThrow('Sequence numbers must be unique');
    });
  });

  describe('getApprovalRulesByCompany', () => {
    it('should retrieve all approval rules for a company', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          companyId: 'company-1',
          name: 'Rule 1',
          isSequentialApproval: true,
          priority: 1,
        },
      ];

      (ApprovalRule.findByCompanyId as jest.Mock).mockResolvedValue(mockRules);
      (ApprovalRuleApprover.findByApprovalRuleId as jest.Mock).mockResolvedValue([]);
      (ApprovalRule.findById as jest.Mock).mockResolvedValue(mockRules[0]);

      const result = await service.getApprovalRulesByCompany('company-1');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(ApprovalRule.findByCompanyId).toHaveBeenCalledWith('company-1');
    });
  });

  describe('updateApprovalRule', () => {
    it('should update an approval rule', async () => {
      const mockRule = {
        id: 'rule-1',
        companyId: 'company-1',
        name: 'Old Name',
        isSequentialApproval: false,
        priority: 1,
        save: jest.fn().mockResolvedValue({
          id: 'rule-1',
          companyId: 'company-1',
          name: 'New Name',
          isSequentialApproval: true,
          priority: 1,
        }),
      };

      (ApprovalRule.findById as jest.Mock).mockResolvedValue(mockRule);
      (ApprovalRuleApprover.findByApprovalRuleId as jest.Mock).mockResolvedValue([]);

      const result = await service.updateApprovalRule('rule-1', {
        name: 'New Name',
        isSequentialApproval: true,
      });

      expect(result.name).toBe('New Name');
      expect(mockRule.save).toHaveBeenCalled();
    });

    it('should throw error if rule not found', async () => {
      (ApprovalRule.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateApprovalRule('rule-1', {
          name: 'New Name',
        })
      ).rejects.toThrow('Approval rule not found');
    });
  });

  describe('deleteApprovalRule', () => {
    it('should delete an approval rule', async () => {
      const mockRule = {
        id: 'rule-1',
        companyId: 'company-1',
      };

      (ApprovalRule.findById as jest.Mock).mockResolvedValue(mockRule);
      (ApprovalRuleApprover.deleteByApprovalRuleId as jest.Mock).mockResolvedValue(1);
      (ApprovalRule.deleteById as jest.Mock).mockResolvedValue(true);

      await service.deleteApprovalRule('rule-1');

      expect(ApprovalRuleApprover.deleteByApprovalRuleId).toHaveBeenCalledWith('rule-1');
      expect(ApprovalRule.deleteById).toHaveBeenCalledWith('rule-1');
    });

    it('should throw error if rule not found', async () => {
      (ApprovalRule.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteApprovalRule('rule-1')).rejects.toThrow(
        'Approval rule not found'
      );
    });
  });
});
