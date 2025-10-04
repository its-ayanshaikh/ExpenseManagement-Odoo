import { Knex } from 'knex';
import { ApprovalRuleType } from '../types/database';
import { SEED_COMPANY_IDS, SEED_USER_IDS, SEED_APPROVAL_RULE_IDS, SEED_APPROVER_IDS } from '../utils/seed-constants';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('approval_rule_approvers').del();
  await knex('approval_rules').del();

  // Sample approval rules for TechCorp USA
  const techCorpRules = [
    {
      id: SEED_APPROVAL_RULE_IDS.TECHCORP_SEQUENTIAL,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      name: 'Sequential Approval - Management Chain',
      rule_type: ApprovalRuleType.SEQUENTIAL,
      percentage_threshold: null,
      specific_approver_id: null,
      is_hybrid: false,
      priority: 1,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVAL_RULE_IDS.TECHCORP_PERCENTAGE,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      name: 'Percentage Rule - 60% Approval',
      rule_type: ApprovalRuleType.PERCENTAGE,
      percentage_threshold: 60,
      specific_approver_id: null,
      is_hybrid: false,
      priority: 2,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVAL_RULE_IDS.TECHCORP_SPECIFIC,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      name: 'Admin Override Rule',
      rule_type: ApprovalRuleType.SPECIFIC_APPROVER,
      percentage_threshold: null,
      specific_approver_id: SEED_USER_IDS.ADMIN_1,
      is_hybrid: false,
      priority: 3,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVAL_RULE_IDS.TECHCORP_HYBRID,
      company_id: SEED_COMPANY_IDS.TECHCORP_USA,
      name: 'Hybrid Rule - 75% OR Admin',
      rule_type: ApprovalRuleType.HYBRID,
      percentage_threshold: 75,
      specific_approver_id: SEED_USER_IDS.ADMIN_1,
      is_hybrid: true,
      priority: 4,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
  ];

  // Sample approval rules for InnovateLtd UK
  const innovateRules = [
    {
      id: SEED_APPROVAL_RULE_IDS.INNOVATE_SEQUENTIAL,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      name: 'Simple Sequential Approval',
      rule_type: ApprovalRuleType.SEQUENTIAL,
      percentage_threshold: null,
      specific_approver_id: null,
      is_hybrid: false,
      priority: 1,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: SEED_APPROVAL_RULE_IDS.INNOVATE_SPECIFIC,
      company_id: SEED_COMPANY_IDS.INNOVATE_UK,
      name: 'Manager Override',
      rule_type: ApprovalRuleType.SPECIFIC_APPROVER,
      percentage_threshold: null,
      specific_approver_id: SEED_USER_IDS.MANAGER_3,
      is_hybrid: false,
      priority: 2,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
  ];

  // Sample approval rules for StartupHub Canada
  const startupRules = [
    {
      id: SEED_APPROVAL_RULE_IDS.STARTUP_PERCENTAGE,
      company_id: SEED_COMPANY_IDS.STARTUP_CANADA,
      name: 'Startup Approval - 50% Threshold',
      rule_type: ApprovalRuleType.PERCENTAGE,
      percentage_threshold: 50,
      specific_approver_id: null,
      is_hybrid: false,
      priority: 1,
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
  ];

  // Insert all approval rules
  const allRules = [...techCorpRules, ...innovateRules, ...startupRules];
  await knex('approval_rules').insert(allRules);

  // Sample approval rule approvers for sequential rules
  const ruleApprovers = [
    // Sequential rule for TechCorp
    {
      id: SEED_APPROVER_IDS.APPROVER_1,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_SEQUENTIAL,
      approver_id: SEED_USER_IDS.MANAGER_1,
      sequence: 1,
      created_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_2,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_SEQUENTIAL,
      approver_id: SEED_USER_IDS.MANAGER_2,
      sequence: 2,
      created_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_3,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_SEQUENTIAL,
      approver_id: SEED_USER_IDS.ADMIN_1,
      sequence: 3,
      created_at: new Date('2024-01-01'),
    },
    // Percentage rule approvers for TechCorp
    {
      id: SEED_APPROVER_IDS.APPROVER_4,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_PERCENTAGE,
      approver_id: SEED_USER_IDS.MANAGER_1,
      sequence: 1,
      created_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_5,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_PERCENTAGE,
      approver_id: SEED_USER_IDS.MANAGER_2,
      sequence: 2,
      created_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_6,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_PERCENTAGE,
      approver_id: SEED_USER_IDS.ADMIN_1,
      sequence: 3,
      created_at: new Date('2024-01-01'),
    },
    // Hybrid rule approvers for TechCorp
    {
      id: SEED_APPROVER_IDS.APPROVER_7,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_HYBRID,
      approver_id: SEED_USER_IDS.MANAGER_1,
      sequence: 1,
      created_at: new Date('2024-01-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_8,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.TECHCORP_HYBRID,
      approver_id: SEED_USER_IDS.MANAGER_2,
      sequence: 2,
      created_at: new Date('2024-01-01'),
    },
    // Sequential rule for InnovateLtd
    {
      id: SEED_APPROVER_IDS.APPROVER_9,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.INNOVATE_SEQUENTIAL,
      approver_id: SEED_USER_IDS.MANAGER_3,
      sequence: 1,
      created_at: new Date('2024-01-15'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_10,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.INNOVATE_SEQUENTIAL,
      approver_id: SEED_USER_IDS.ADMIN_2,
      sequence: 2,
      created_at: new Date('2024-01-15'),
    },
    // Percentage rule approvers for StartupHub
    {
      id: SEED_APPROVER_IDS.APPROVER_11,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.STARTUP_PERCENTAGE,
      approver_id: SEED_USER_IDS.MANAGER_4,
      sequence: 1,
      created_at: new Date('2024-02-01'),
    },
    {
      id: SEED_APPROVER_IDS.APPROVER_12,
      approval_rule_id: SEED_APPROVAL_RULE_IDS.STARTUP_PERCENTAGE,
      approver_id: SEED_USER_IDS.ADMIN_3,
      sequence: 2,
      created_at: new Date('2024-02-01'),
    },
  ];

  await knex('approval_rule_approvers').insert(ruleApprovers);
}