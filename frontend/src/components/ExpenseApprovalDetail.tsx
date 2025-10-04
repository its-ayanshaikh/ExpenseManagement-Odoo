import React, { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { expenseService } from '../services/expenseService'
import { Expense, ExpenseStatus } from '../types'
import { formatCurrency, formatDate } from '../utils'
import { useApprovalActionNotifications } from '../hooks/useApprovalNotifications'
import ApprovalTimeline from './ApprovalTimeline'

interface ExpenseApprovalDetailProps {
  expense: Expense
  onBack?: () => void
  onApprovalComplete?: () => void
}

export const ExpenseApprovalDetail: React.FC<ExpenseApprovalDetailProps> = ({
  expense,
  onBack,
  onApprovalComplete
}) => {
  const queryClient = useQueryClient()
  const { notifyApprovalSuccess, notifyRejectionSuccess, notifyApprovalError } = useApprovalActionNotifications()
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionComments, setRejectionComments] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  // Fetch approval history
  const { data: approvalHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['approvalHistory', expense.id],
    queryFn: () => expenseService.getApprovalHistory(expense.id),
  })

  // Approve expense mutation
  const approveMutation = useMutation({
    mutationFn: ({ comments }: { comments?: string }) =>
      expenseService.approveExpense(expense.id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['approvalHistory', expense.id] })
      setShowApprovalModal(false)
      setApprovalComments('')
      notifyApprovalSuccess(expense.description)
      onApprovalComplete?.()
    },
    onError: () => {
      notifyApprovalError('approve')
    },
  })

  // Reject expense mutation
  const rejectMutation = useMutation({
    mutationFn: (comments: string) =>
      expenseService.rejectExpense(expense.id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['approvalHistory', expense.id] })
      setShowRejectionModal(false)
      setRejectionComments('')
      notifyRejectionSuccess(expense.description)
      onApprovalComplete?.()
    },
    onError: () => {
      notifyApprovalError('reject')
    },
  })

  const handleApprove = () => {
    setShowApprovalModal(true)
  }

  const handleReject = () => {
    setShowRejectionModal(true)
  }

  const confirmApproval = () => {
    const comments = approvalComments.trim()
    approveMutation.mutate({ comments: comments.length > 0 ? comments : undefined })
  }

  const confirmRejection = () => {
    if (rejectionComments.trim()) {
      rejectMutation.mutate(rejectionComments.trim())
    }
  }

  const getStatusBadge = (status: ExpenseStatus) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium'
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

  const canApprove = expense.status === ExpenseStatus.PENDING

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
          <span className={getStatusBadge(expense.status)}>
            {expense.status}
          </span>
        </div>
        {canApprove && (
          <div className="flex space-x-3">
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md font-medium"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-md font-medium"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}
      </div>

      {/* Expense Details Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900">{expense.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <p className="mt-1 text-sm text-gray-900">{expense.category}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expense Date</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(expense.expenseDate)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Submitted Date</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(expense.createdAt)}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (Company Currency)</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
              </p>
            </div>

            {expense.currency !== expense.convertedCurrency && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Original Amount</label>
                <p className="mt-1 text-sm text-gray-600">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                <span className={getStatusBadge(expense.status)}>
                  {expense.status}
                </span>
              </div>
            </div>

            {expense.submitter && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                <p className="mt-1 text-sm text-gray-900">
                  {expense.submitter.firstName} {expense.submitter.lastName}
                </p>
                <p className="text-sm text-gray-600">{expense.submitter.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Receipt */}
        {expense.receiptUrl && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Receipt</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <img
                src={expense.receiptUrl}
                alt="Expense receipt"
                className="max-w-full h-auto max-h-96 mx-auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* Approval Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Approval Timeline</h2>
        {historyLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ApprovalTimeline 
            expenseId={expense.id}
            approvalHistory={approvalHistory} 
            currentStatus={expense.status}
          />
        )}
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
                <p className="text-sm text-gray-600 mb-3">
                  You are about to approve this expense for{' '}
                  <span className="font-semibold">
                    {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                  </span>
                </p>
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
                <p className="text-sm text-gray-600 mb-3">
                  You are about to reject this expense for{' '}
                  <span className="font-semibold">
                    {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                  </span>
                </p>
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