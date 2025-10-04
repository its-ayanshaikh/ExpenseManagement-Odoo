import { api } from './api'
import { ApprovalRule, CreateApprovalRuleDTO, UpdateApprovalRuleDTO } from '../types'

export class ApprovalRuleService {
  // Create new approval rule (Admin only)
  async createApprovalRule(ruleData: CreateApprovalRuleDTO): Promise<ApprovalRule> {
    const response = await api.post<{ data: { approvalRule: ApprovalRule } }>('/approval-rules', ruleData)
    return response.data.approvalRule
  }

  // Get all approval rules in company (Admin only)
  async getApprovalRules(): Promise<ApprovalRule[]> {
    const response = await api.get<{ data: { approvalRules: ApprovalRule[] } }>('/approval-rules')
    return response.data.approvalRules
  }

  // Get approval rule by ID (Admin only)
  async getApprovalRuleById(id: string): Promise<ApprovalRule> {
    const response = await api.get<{ data: { approvalRule: ApprovalRule } }>(`/approval-rules/${id}`)
    return response.data.approvalRule
  }

  // Update approval rule (Admin only)
  async updateApprovalRule(id: string, ruleData: UpdateApprovalRuleDTO): Promise<ApprovalRule> {
    const response = await api.put<{ data: { approvalRule: ApprovalRule } }>(`/approval-rules/${id}`, ruleData)
    return response.data.approvalRule
  }

  // Delete approval rule (Admin only)
  async deleteApprovalRule(id: string): Promise<void> {
    await api.delete<void>(`/approval-rules/${id}`)
  }
}

export const approvalRuleService = new ApprovalRuleService()