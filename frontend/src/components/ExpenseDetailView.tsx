import React, { useState, useEffect } from 'react'
import { Expense, ExpenseStatus, ApprovalHistory } from '../types'
import { expenseService } from '../services/expenseService'
import useApi from '../hooks/useApi'
import ApprovalTimeline from './ApprovalTimeline'

interface ExpenseDetailViewProps {
  expenseId: string
  onBack?: () => void
}

const ExpenseDetailView: React.FC<ExpenseDetailViewProps> = ({ expenseId, onBack }) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([])

  const {
    loading: loadingExpense,
    error: expenseError,
    execute: loadExpense
  } = useApi(expenseService.getExpenseById.bind(expenseService))

  const {
    loading: loadingHistory,
    error: historyError,
    execute: loadHistory
  } = useApi(expenseService.getApprovalHistory.bind(expenseService))

  // Load expense and approval history on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expenseResult, historyResult] = await Promise.all([
          loadExpense(expenseId),
          loadHistory(expenseId)
        ])
        
        if (expenseResult) {
          setExpense(expenseResult)
        }
        
        if (historyResult) {
          setApprovalHistory(historyResult)
        }
      } catch (error) {
        console.error('Failed to load expense details:', error)
      }
    }

    fetchData()
  }, [expenseId, loadExpense, loadHistory])

  // Get status badge styling
  const getStatusBadge = (status: ExpenseStatus) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'
    
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

  // Format currency display
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Format date display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format datetime display
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loadingExpense || loadingHistory) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading expense details...</span>
      </div>
    )
  }

  if (expenseError || historyError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading expense details</h3>
            <p className="mt-1 text-sm text-red-700">{expenseError || historyError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Expense not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested expense could not be found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
        </div>
        <span className={getStatusBadge(expense.status)}>
          {expense.status}
        </span>
      </div>

      {/* Main expense details card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Expense Information</h2>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {/* Description */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
            </div>

            {/* Category */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">{expense.category}</dd>
            </div>

            {/* Original Amount */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Original Amount</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(expense.amount, expense.currency)}
              </dd>
            </div>

            {/* Converted Amount (if different currency) */}
            {expense.currency !== expense.convertedCurrency && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Amount in Company Currency ({expense.convertedCurrency})
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                </dd>
              </div>
            )}

            {/* Expense Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Expense Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(expense.expenseDate)}</dd>
            </div>

            {/* Submitted Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateTime(expense.createdAt)}</dd>
            </div>

            {/* Submitter (if available) */}
            {expense.submitter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {expense.submitter.firstName} {expense.submitter.lastName}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Receipt section */}
      {expense.receiptUrl && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Receipt</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex justify-center">
              <img
                src={expense.receiptUrl}
                alt="Expense receipt"
                className="max-w-full h-auto max-h-96 rounded-lg shadow-md border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                        <div class="text-center">
                          <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="mt-2 text-sm text-gray-500">Receipt image unavailable</p>
                        </div>
                      </div>
                    `
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Approval Timeline */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Approval Timeline</h2>
        </div>
        <div className="px-6 py-4">
          <ApprovalTimeline 
            expenseId={expense.id}
            approvalHistory={approvalHistory}
            currentStatus={expense.status}
          />
        </div>
      </div>
    </div>
  )
}

export default ExpenseDetailView