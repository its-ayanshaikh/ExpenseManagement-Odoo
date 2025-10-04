import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationContainer } from './components/NotificationContainer'
import { AccessibilityEnhancer, SkipLink } from './components/shared/AccessibilityEnhancer'
import { AccessibilityTester } from './components/dev/AccessibilityTester'
import { LoginPage, SignupPage, DashboardPage, UserManagementPage, ApprovalRuleConfigPage, AdminExpensesPage } from './pages'
import ProtectedRoute from './components/ProtectedRoute'
import { UserRole } from './types'
import { parseApiError } from './utils/errorHandling'

// Create a client for React Query with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const appError = parseApiError(error)
        // Only retry for network errors and server errors, max 2 times
        return appError.retryable === true && failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error) => {
        const appError = parseApiError(error)
        // Only retry mutations for network errors, max 1 time
        return appError.retryable === true && appError.type === 'NETWORK' && failureCount < 1
      },
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <AuthProvider>
            <AccessibilityEnhancer>
              <Router>
                <div className="min-h-screen bg-gray-50">
                  {/* Skip links for keyboard navigation */}
                  <SkipLink href="#main-content">
                    Skip to main content
                  </SkipLink>
                  <SkipLink href="#navigation">
                    Skip to navigation
                  </SkipLink>
                <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected routes - General access */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            {/* Admin-only routes (Requirement 7.1) */}
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly>
                <UserManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/approval-rules" element={
              <ProtectedRoute adminOnly>
                <ApprovalRuleConfigPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/expenses" element={
              <ProtectedRoute adminOnly>
                <AdminExpensesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute adminOnly>
                <div>Admin Panel - Other admin features</div>
              </ProtectedRoute>
            } />
            
            {/* Manager or Admin routes (Requirements 7.1, 7.2) */}
            <Route path="/approvals/*" element={
              <ProtectedRoute managerOrAdmin>
                <div>Approval Management - Pending Approvals, Team Expenses</div>
              </ProtectedRoute>
            } />
            
            {/* Employee-only routes (Requirement 7.3) */}
            <Route path="/employee/*" element={
              <ProtectedRoute employeeOnly>
                <div>Employee Panel - Submit Expenses, View Own Expenses</div>
              </ProtectedRoute>
            } />
            
            {/* Specific role requirements */}
            <Route path="/manager-dashboard" element={
              <ProtectedRoute requiredRole={UserRole.MANAGER}>
                <div>Manager Dashboard</div>
              </ProtectedRoute>
            } />
            
            {/* Multiple role requirements (any of the specified roles) */}
            <Route path="/expenses" element={
              <ProtectedRoute 
                requiredRole={[UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN]} 
                requireAnyRole
              >
                <div>Expense Management - All roles can access</div>
              </ProtectedRoute>
            } />
            
            {/* Custom permission check */}
            <Route path="/special-access" element={
              <ProtectedRoute 
                customCheck={(user) => user?.isManagerApprover === true}
              >
                <div>Special Access - Only for users with manager approver flag</div>
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
                  {/* Catch all - redirect to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                
                {/* Global notification container */}
                <NotificationContainer />
                
                {/* Development accessibility tester */}
                <AccessibilityTester />
                </div>
              </Router>
            </AccessibilityEnhancer>
          </AuthProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
