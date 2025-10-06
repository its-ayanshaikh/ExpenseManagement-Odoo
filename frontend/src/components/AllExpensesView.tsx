import React, { useState, useEffect } from 'react'
import { Expense, ExpenseStatus, User } from '../types'
import { expenseService } from '../services/expenseService'
import { userService } from '../services/userService'
import { useAuth } from '../hooks/useAuth'
import useApi from '../hooks/useApi'
import { useNotifications } from '../contexts/NotificationContext'

interface AllExpensesViewProps {
  onExpenseClick?: (expense: Expense) => void
}

interface FilterState {
  status: ExpenseStatus | 'ALL'
  dateFrom: string
  dateTo: string
  submitterId: string | 'ALL'
}

interface AdminOverrideModalProps {
  isOpen: boolean
  expense: Expense | null
  action: 'approve' | 'reject'
  onClose: () => void
  onConfirm: (comments: string) => void
  loading: boolean
}

const AdminOverrideModal: React.FC<AdminOverrideModalProps> = ({
  isOpen,
  expense,
  action,
  onClose,
  onConfirm,
  loading
}) => {
  const [comments, setComments] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (comments.trim()) {
      onConfirm(comments.trim())
    }
  }

  const handleClose = () => {
    setComments('')
    onClose()
  }

  if (!isOpen || !expense) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Admin Override {action === 'approve' ? 'Approval' : 'Rejection'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Expense:</strong> {expense.description}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Amount:</strong> {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: expense.currency
              }).format(expense.amount)}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Status:</strong> {expense.status}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Required)
              </label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={`Explain why you are overriding to ${action} this expense...`}
                required
                disabled={loading}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading || !comments.trim()}
              >
                {loading ? 'Processing...' : `Override ${action === 'approve' ? 'Approve' : 'Reject'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const AllExpensesView: React.FC<AllExpensesViewProps> = ({ onExpenseClick }) => {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filters, setFilters] = useState<FilterState>({
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    submitterId: 'ALL'
  })
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean
    expense: Expense | null
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    expense: null,
    action: 'approve'
  })

  const {
    loading: loadingExpenses,
    error: loadError,
    execute: loadExpenses
  } = useApi(expenseService.getAllCompanyExpenses.bind(expenseService))

  const {
    loading: loadingUsers,
    execute: loadUsers
  } = useApi(userService.getUsers.bind(userService))

  const {
    loading: overrideLoading,
    execute: executeOverride
  } = useApi(() => Promise.resolve())

  // Load expenses and users on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesResult, usersResult] = await Promise.all([
          loadExpenses(),
          loadUsers()
        ])
        
        if (expensesResult) {
          setExpenses(expensesResult)
          setFilteredExpenses(expensesResult)
        }
        
        if (usersResult) {
          setUsers(usersResult)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply filters when filters or expenses change
  useEffect(() => {
    let filtered = [...expenses]

    // Filter by status
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(expense => expense.status === filters.status)
    }

    // Filter by submitter
    if (filters.submitterId !== 'ALL') {
      filtered = filtered.filter(expense => expense.submitterId === filters.submitterId)
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(expense => 
        new Date(expense.expenseDate) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(expense => 
        new Date(expense.expenseDate) <= new Date(filters.dateTo)
      )
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredExpenses(filtered)
  }, [expenses, filters])

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      submitterId: 'ALL'
    })
  }

  // Handle admin override
  const handleOverride = (expense: Expense, action: 'approve' | 'reject') => {
    setOverrideModal({
      isOpen: true,
      expense,
      action
    })
  }

  // Execute admin override
  const executeAdminOverride = async (comments: string) => {
    if (!overrideModal.expense) return

    try {
      if (overrideModal.action === 'approve') {
        await executeOverride(() => expenseService.adminOverrideApprove(overrideModal.expense!.id, comments))
        showSuccess('Expense approved via admin override!', 'Admin Override')
      } else {
        await executeOverride(() => expenseService.adminOverrideReject(overrideModal.expense!.id, comments))
        showSuccess('Expense rejected via admin override!', 'Admin Override')
      }

      // Refresh expenses
      const updatedExpenses = await loadExpenses()
      if (updatedExpenses) {
        setExpenses(updatedExpenses)
      }

      // Close modal
      setOverrideModal({ isOpen: false, expense: null, action: 'approve' })
    } catch (error) {
      console.error('Failed to execute admin override:', error)
      showError('Failed to execute admin override. Please try again.', 'Admin Override')
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: ExpenseStatus) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    
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
      month: 'short',
      day: 'numeric'
    })
  }

  // Get submitter name
  const getSubmitterName = (submitterId: string) => {
    const submitter = users.find(u => u.id === submitterId)
    return submitter ? `${submitter.firstName} ${submitter.lastName}` : 'Unknown'
  }

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN'

  if (loadingExpenses || loadingUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading expenses...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading expenses</h3>
            <p className="mt-1 text-sm text-red-700">{loadError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">All Company Expenses</h2>
        <div className="text-sm text-gray-500">
          {filteredExpenses.length} of {expenses.length} expenses
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value={ExpenseStatus.PENDING}>Pending</option>
              <option value={ExpenseStatus.APPROVED}>Approved</option>
              <option value={ExpenseStatus.REJECTED}>Rejected</option>
            </select>
          </div>

          {/* Submitter Filter */}
          <div>
            <label htmlFor="submitter-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Submitter
            </label>
            <select
              id="submitter-filter"
              value={filters.submitterId}
              onChange={(e) => handleFilterChange('submitterId', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="ALL">All Submitters</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Date From Filter */}
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="date-from"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Date To Filter */}
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="date-to"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {expenses.length === 0 
              ? "No expenses have been submitted yet." 
              : "No expenses match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <li key={expense.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div 
                      className={`flex items-center flex-1 ${onExpenseClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onExpenseClick?.(expense)}
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {expense.description}
                          </p>
                          <span className={`ml-2 ${getStatusBadge(expense.status)}`}>
                            {expense.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>{getSubmitterName(expense.submitterId)}</span>
                          <span className="mx-2">•</span>
                          <span>{expense.category}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(expense.expenseDate)}</span>
                          {expense.receiptUrl && (
                            <>
                              <span className="mx-2">•</span>
                              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="ml-1">Receipt</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        {expense.currency !== expense.convertedCurrency && (
                          <p className="text-xs text-gray-500">
                            {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Admin Override Actions */}
                    {isAdmin && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleOverride(expense, 'approve')}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          title="Admin Override Approve"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Override Approve
                        </button>
                        <button
                          onClick={() => handleOverride(expense, 'reject')}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Admin Override Reject"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Override Reject
                        </button>
                      </div>
                    )}

                    {onExpenseClick && (
                      <div className="ml-4">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin Override Modal */}
      <AdminOverrideModal
        isOpen={overrideModal.isOpen}
        expense={overrideModal.expense}
        action={overrideModal.action}
        onClose={() => setOverrideModal({ isOpen: false, expense: null, action: 'approve' })}
        onConfirm={executeAdminOverride}
        loading={overrideLoading}
      />
    </div>
  )
}

export default AllExpensesView