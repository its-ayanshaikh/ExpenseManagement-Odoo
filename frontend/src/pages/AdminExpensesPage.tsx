import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AllExpensesView from '../components/AllExpensesView'
import ExpenseDetailView from '../components/ExpenseDetailView'
import { Expense } from '../types'

const AdminExpensesPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  const handleBackToList = () => {
    setSelectedExpense(null)
  }

  const navigateToUserManagement = () => {
    navigate('/admin/users')
  }

  const navigateToApprovalRules = () => {
    navigate('/admin/approval-rules')
  }

  const navigateToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">
                Expense Management System
              </h1>
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={navigateToDashboard}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-indigo-600"
                >
                  All Expenses
                </button>
                <button
                  onClick={navigateToUserManagement}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  User Management
                </button>
                <button
                  onClick={navigateToApprovalRules}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Approval Rules
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {selectedExpense ? (
            <div>
              <div className="mb-6">
                <button
                  onClick={handleBackToList}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to All Expenses
                </button>
              </div>
              <ExpenseDetailView 
                expenseId={selectedExpense.id}
                onBack={handleBackToList}
              />
            </div>
          ) : (
            <AllExpensesView onExpenseClick={handleExpenseClick} />
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminExpensesPage