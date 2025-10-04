import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expenseService } from '../services/expenseService'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from './useAuth'
import { UserRole, Expense } from '../types'

/**
 * Hook to handle approval request notifications for managers
 * This hook polls for pending approvals and shows notifications when new ones arrive
 */
export const useApprovalNotifications = () => {
  const { user } = useAuth()
  const { showInfo } = useNotifications()

  // Only fetch pending approvals for managers and admins
  const shouldFetch = Boolean(user && (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN))

  const { data: pendingApprovals = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['pendingApprovals'],
    queryFn: () => expenseService.getPendingApprovals(),
    enabled: shouldFetch,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  })

  // Track previous count to detect new approvals
  useEffect(() => {
    if (!shouldFetch || isLoading) return

    const currentCount = pendingApprovals.length
    const previousCount = parseInt(localStorage.getItem('previousApprovalCount') || '0', 10)

    // Show notification if there are new pending approvals
    if (currentCount > previousCount && previousCount > 0) {
      const newCount = currentCount - previousCount
      showInfo(
        `You have ${newCount} new expense${newCount > 1 ? 's' : ''} awaiting your approval`,
        'New Approval Request',
        {
          duration: 8000, // Show for 8 seconds
          action: {
            label: 'View Approvals',
            onClick: () => {
              // Navigate to approvals page
              window.location.href = '/approvals'
            }
          }
        }
      )
    }

    // Update stored count
    localStorage.setItem('previousApprovalCount', currentCount.toString())
  }, [pendingApprovals.length, shouldFetch, isLoading, showInfo])

  return {
    pendingApprovals,
    pendingCount: pendingApprovals.length,
    isLoading
  }
}

/**
 * Hook to show notifications for specific approval actions
 * This can be used in components that handle approval actions
 */
export const useApprovalActionNotifications = () => {
  const { showSuccess, showError, showInfo } = useNotifications()

  const notifyApprovalSuccess = (expenseDescription: string) => {
    showSuccess(
      `Expense "${expenseDescription}" has been approved successfully`,
      'Approval Complete'
    )
  }

  const notifyRejectionSuccess = (expenseDescription: string) => {
    showSuccess(
      `Expense "${expenseDescription}" has been rejected`,
      'Rejection Complete'
    )
  }

  const notifyApprovalError = (action: 'approve' | 'reject') => {
    showError(
      `Failed to ${action} expense. Please try again.`,
      'Approval Error'
    )
  }

  const notifyNewApprovalRequest = (expenseDescription: string, submitterName: string) => {
    showInfo(
      `New expense "${expenseDescription}" from ${submitterName} requires your approval`,
      'New Approval Request',
      {
        duration: 10000,
        action: {
          label: 'Review',
          onClick: () => {
            window.location.href = '/approvals'
          }
        }
      }
    )
  }

  return {
    notifyApprovalSuccess,
    notifyRejectionSuccess,
    notifyApprovalError,
    notifyNewApprovalRequest
  }
}