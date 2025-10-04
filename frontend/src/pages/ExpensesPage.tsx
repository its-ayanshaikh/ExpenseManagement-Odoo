import React, { useState } from 'react'
import { Expense } from '../types'
import { ExpenseSubmissionForm, ExpenseHistoryView, ExpenseDetailView } from '../components'

const ExpensesPage: React.FC = () => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSubmissionSuccess = () => {
    setShowSubmissionForm(false)
    // Trigger refresh of expense history
    setRefreshKey(prev => prev + 1)
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpenseId(expense.id)
  }

  const handleBackToList = () => {
    setSelectedExpenseId(null)
    // Trigger refresh to get any updated data
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {selectedExpenseId ? (
            /* Expense Detail View */
            <ExpenseDetailView 
              expenseId={selectedExpenseId}
              onBack={handleBackToList}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
                <button
                  onClick={() => setShowSubmissionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Submit Expense
                </button>
              </div>

              {/* Expense History */}
              <ExpenseHistoryView 
                key={refreshKey}
                onExpenseClick={handleExpenseClick}
              />
            </>
          )}

          {/* Submission Form Modal */}
          {showSubmissionForm && (
            <ExpenseSubmissionForm
              onSuccess={handleSubmissionSuccess}
              onClose={() => setShowSubmissionForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpensesPage