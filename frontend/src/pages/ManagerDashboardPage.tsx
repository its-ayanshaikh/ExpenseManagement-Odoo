import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { UserRole, Expense } from '../types'
import { PendingApprovalsView } from '../components/PendingApprovalsView'
import { ExpenseApprovalDetail } from '../components/ExpenseApprovalDetail'
import { TeamExpensesView } from '../components/TeamExpensesView'
import { useApprovalNotifications } from '../hooks/useApprovalNotifications'

type ViewMode = 'pending' | 'team' | 'detail'

export const ManagerDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [currentView, setCurrentView] = useState<ViewMode>('pending')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  
  // Enable approval notifications for managers
  const { pendingCount } = useApprovalNotifications()

  // Only allow managers and admins to access this page
  if (!user || (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need manager or admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setCurrentView('detail')
  }

  const handleBackToList = () => {
    setSelectedExpense(null)
    setCurrentView('pending')
  }

  const handleApprovalComplete = () => {
    setSelectedExpense(null)
    setCurrentView('pending')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage expense approvals and view team expenses
          </p>
        </div>

        {/* Navigation Tabs */}
        {currentView !== 'detail' && (
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setCurrentView('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approvals
              </button>
              <button
                onClick={() => setCurrentView('team')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'team'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Team Expenses
              </button>
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {currentView === 'pending' && (
              <PendingApprovalsView onExpenseClick={handleExpenseClick} />
            )}
            
            {currentView === 'team' && (
              <TeamExpensesView onExpenseClick={handleExpenseClick} />
            )}
            
            {currentView === 'detail' && selectedExpense && (
              <ExpenseApprovalDetail
                expense={selectedExpense}
                onBack={handleBackToList}
                onApprovalComplete={handleApprovalComplete}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}