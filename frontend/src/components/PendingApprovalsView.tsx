import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '../services/expenseService'
import { Expense, ExpenseStatus } from '../types'
import { formatCurrency, formatDate } from '../utils'
import { useApprovalActionNotifications } from '../hooks/useApprovalNotifications'

interface PendingApprovalsViewProps {
  onExpenseClick?: (expense: Expense) => void
}

export const PendingApprovalsView: React.FC<PendingApprovalsViewProps> = ({
  onExpenseClick
}) => {
  const queryClient = useQueryClient()
  const { notifyApprovalSuccess, notifyRejectionSuccess, notifyApprovalError } = useApprovalActionNotifications()
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionComments, setRejectionComments] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  // Fetch pending approvals
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: () => expenseService.getPendingApprovals(),
  })

  // Approve expense mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      expenseService.approveExpense(id, comments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowApprovalModal(false)
      setApprovalComments('')
      
      // Find the expense to get its description for notification
      const expense = expenses.find(e => e.id === variables.id)
      if (expense) {
        notifyApprovalSuccess(expense.description)
      }
      
      setSelectedExpense(null)
    },
    onError: () => {
      notifyApprovalError('approve')
    },
  })

  // Reject expense mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      expenseService.rejectExpense(id, comments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowRejectionModal(false)
      setRejectionComments('')
      
      // Find the expense to get its description for notification
      const expense = expenses.find(e => e.id === variables.id)
      if (expense) {
        notifyRejectionSuccess(expense.description)
      }
      
      setSelectedExpense(null)
    },
    onError: () => {
      notifyApprovalError('reject')
    },
  })

  const handleApprove = (expenseId: string) => {
    setSelectedExpense(expenseId)
    setShowApprovalModal(true)
  }

  const handleReject = (expenseId: string) => {
    setSelectedExpense(expenseId)
    setShowRejectionModal(true)
  }

  const confirmApproval = () => {
    if (selectedExpense) {
      approveMutation.mutate({
        id: selectedExpense,
        comments: approvalComments.trim() || undefined,
      })
    }
  }

  const confirmRejection = () => {
    if (selectedExpense && rejectionComments.trim()) {
      rejectMutation.mutate({
        id: selectedExpense,
        comments: rejectionComments.trim(),
      })
    }
  }

  const getStatusBadge = (status: ExpenseStatus) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case ExpenseStatus.PENDING:
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case ExpenseStatus.APPROVED:
        return `${baseClasses} bg-green-100 text-green-800`
      case ExpenseStatus.REJECTED:
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          Error loading pending approvals. Please try again.
        </div>
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No expenses pending your approval</div>
        <div className="text-gray-400 text-sm mt-2">
          Expenses requiring your approval will appear here
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Pending Approvals ({expenses.length})
        </h2>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {expenses.map((expense) => (
            <li key={expense.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {expense.description}
                        </p>
                        <span className={getStatusBadge(expense.status)}>
                          {expense.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                          {expense.currency !== expense.convertedCurrency && (
                            <span className="ml-1 text-gray-400">
                              (Original: {formatCurrency(expense.amount, expense.currency)})
                            </span>
                          )}
                        </span>
                        <span>•</span>
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onExpenseClick?.(expense)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleApprove(expense.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        {approveMutation.isPending && selectedExpense === expense.id
                          ? 'Approving...'
                          : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(expense.id)}
                        disabled={rejectMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        {rejectMutation.isPending && selectedExpense === expense.id
                          ? 'Rejecting...'
                          : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Approve Expense
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any comments about this approval..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false)
                    setApprovalComments('')
                    setSelectedExpense(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproval}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-md"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reject Expense
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Required) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionComments}
                  onChange={(e) => setRejectionComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Please provide a reason for rejecting this expense..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectionModal(false)
                    setRejectionComments('')
                    setSelectedExpense(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRejection}
                  disabled={rejectMutation.isPending || !rejectionComments.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-md"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}