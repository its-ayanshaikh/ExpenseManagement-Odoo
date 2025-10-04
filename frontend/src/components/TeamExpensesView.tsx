import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expenseService } from '../services/expenseService'
import { Expense, ExpenseStatus } from '../types'
import { formatCurrency, formatDate } from '../utils'

interface TeamExpensesViewProps {
  onExpenseClick?: (expense: Expense) => void
}

interface FilterState {
  status: string
  startDate: string
  endDate: string
}

export const TeamExpensesView: React.FC<TeamExpensesViewProps> = ({
  onExpenseClick
}) => {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    startDate: '',
    endDate: ''
  })

  // Fetch team expenses with filters
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['teamExpenses', filters],
    queryFn: () => {
      const queryFilters: { status?: string; startDate?: string; endDate?: string } = {}
      if (filters.status) queryFilters.status = filters.status
      if (filters.startDate) queryFilters.startDate = filters.startDate
      if (filters.endDate) queryFilters.endDate = filters.endDate
      
      return expenseService.getTeamExpenses(queryFilters)
    },
  })

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: ''
    })
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

  // Calculate summary statistics
  const totalExpenses = expenses.length
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.convertedAmount, 0)
  const pendingCount = expenses.filter(e => e.status === ExpenseStatus.PENDING).length
  const approvedCount = expenses.filter(e => e.status === ExpenseStatus.APPROVED).length
  const rejectedCount = expenses.filter(e => e.status === ExpenseStatus.REJECTED).length

  // Get the company currency from the first expense (they should all have the same converted currency)
  const companyCurrency = expenses.length > 0 ? expenses[0].convertedCurrency : 'USD'

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
          Error loading team expenses. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Team Expenses</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900">{totalExpenses}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount, companyCurrency)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value={ExpenseStatus.PENDING}>Pending</option>
              <option value={ExpenseStatus.APPROVED}>Approved</option>
              <option value={ExpenseStatus.REJECTED}>Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {Object.values(filters).some(f => f) 
              ? 'No expenses match your filters'
              : 'No team expenses found'
            }
          </div>
          <div className="text-gray-400 text-sm mt-2">
            {Object.values(filters).some(f => f)
              ? 'Try adjusting your filters to see more results'
              : 'Expenses from your direct reports will appear here'
            }
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <li key={expense.id} className="px-6 py-4 hover:bg-gray-50">
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
                          <span className="font-medium">
                            {formatCurrency(expense.convertedAmount, expense.convertedCurrency)}
                            {expense.currency !== expense.convertedCurrency && (
                              <span className="ml-1 text-gray-400 font-normal">
                                (Original: {formatCurrency(expense.amount, expense.currency)})
                              </span>
                            )}
                          </span>
                          <span>•</span>
                          <span>{expense.category}</span>
                          <span>•</span>
                          <span>{formatDate(expense.expenseDate)}</span>
                          {expense.submitter && (
                            <>
                              <span>•</span>
                              <span>
                                {expense.submitter.firstName} {expense.submitter.lastName}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Submitted: {formatDate(expense.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onExpenseClick?.(expense)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Summary at Bottom */}
      {expenses.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </span>
            <div className="flex space-x-4 text-gray-600">
              <span>Pending: {pendingCount}</span>
              <span>Approved: {approvedCount}</span>
              <span>Rejected: {rejectedCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}