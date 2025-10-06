import React, { useState } from 'react'
import { PendingApprovalsView } from '../components/PendingApprovalsView'
import { TeamExpensesView } from '../components/TeamExpensesView'
import { ExpenseApprovalDetail } from '../components/ExpenseApprovalDetail'
import { Expense } from '../types'

type TabType = 'pending' | 'team'

export const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  const handleBack = () => {
    setSelectedExpense(null)
  }

  const handleApprovalComplete = () => {
    setSelectedExpense(null)
  }

  // If an expense is selected, show the detail view
  if (selectedExpense) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ExpenseApprovalDetail
          expense={selectedExpense}
          onBack={handleBack}
          onApprovalComplete={handleApprovalComplete}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Management</h1>
        <p className="mt-2 text-gray-600">
          Review and approve expenses from your team
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Team Expenses
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'pending' && (
          <PendingApprovalsView onExpenseClick={handleExpenseClick} />
        )}
        {activeTab === 'team' && (
          <TeamExpensesView onExpenseClick={handleExpenseClick} />
        )}
      </div>
    </div>
  )
}
