import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalRuleService } from '../services/approvalRuleService'
import { ApprovalRule, ApprovalRuleType } from '../types'
import { useAuth } from '../hooks/useAuth'
import ApprovalRuleForm from '../components/ApprovalRuleForm'

const ApprovalRuleConfigPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Fetch approval rules
  const { data: approvalRules = [], isLoading, error } = useQuery({
    queryKey: ['approvalRules'],
    queryFn: () => approvalRuleService.getApprovalRules(),
    enabled: user?.role === 'ADMIN'
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalRuleService.deleteApprovalRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRules'] })
      setDeleteConfirm(null)
    },
    onError: (error: any) => {
      console.error('Failed to delete approval rule:', error)
      alert('Failed to delete approval rule. It may be in use by pending approvals.')
    }
  })

  const handleCreateRule = () => {
    setEditingRule(null)
    setShowForm(true)
  }

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleDeleteRule = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingRule(null)
  }

  const getRuleTypeDisplay = (ruleType: ApprovalRuleType, isHybrid: boolean) => {
    if (isHybrid) return 'Hybrid'
    switch (ruleType) {
      case ApprovalRuleType.SEQUENTIAL:
        return 'Sequential'
      case ApprovalRuleType.PERCENTAGE:
        return 'Percentage'
      case ApprovalRuleType.SPECIFIC_APPROVER:
        return 'Specific Approver'
      default:
        return ruleType
    }
  }

  const getRuleDescription = (rule: ApprovalRule) => {
    if (rule.isHybrid) {
      return `${rule.percentageThreshold}% approval OR specific approver`
    }
    
    switch (rule.ruleType) {
      case ApprovalRuleType.SEQUENTIAL:
        return `${rule.approvers.length} approvers in sequence`
      case ApprovalRuleType.PERCENTAGE:
        return `${rule.percentageThreshold}% approval required`
      case ApprovalRuleType.SPECIFIC_APPROVER:
        return 'Specific approver can auto-approve'
      default:
        return 'Custom rule'
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need Admin privileges to access approval rule configuration.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">Failed to load approval rules. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Approval Rules</h1>
              <p className="mt-2 text-gray-600">
                Configure approval workflows and conditional rules for expense processing
              </p>
            </div>
            <button
              onClick={handleCreateRule}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Create Rule
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="px-4 sm:px-0">
          {approvalRules.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approval rules configured</h3>
              <p className="text-gray-600 mb-4">
                Create your first approval rule to define how expenses should be processed
              </p>
              <button
                onClick={handleCreateRule}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Create First Rule
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {approvalRules
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule) => (
                    <li key={rule.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Priority {rule.priority}
                              </span>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                              <div className="mt-1 flex items-center space-x-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {getRuleTypeDisplay(rule.ruleType, rule.isHybrid)}
                                </span>
                                <p className="text-sm text-gray-600">
                                  {getRuleDescription(rule)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-900 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <ApprovalRuleForm
          rule={editingRule}
          onClose={handleFormClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['approvalRules'] })
            handleFormClose()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Approval Rule</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this approval rule? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalRuleConfigPage