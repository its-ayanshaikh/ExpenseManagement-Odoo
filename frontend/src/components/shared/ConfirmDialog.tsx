import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  disabled?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
  disabled = false,
}) => {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          confirmText: 'text-white',
        }
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          confirmText: 'text-white',
        }
      case 'info':
        return {
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          confirmText: 'text-white',
        }
      default:
        return {
          icon: '⚠️',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          confirmText: 'text-white',
        }
    }
  }

  const config = getTypeConfig(type)

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (!isLoading && !disabled) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center mr-4`} aria-hidden="true">
              <span className={`text-lg ${config.iconColor}`}>{config.icon}</span>
            </div>
            <h3 id="dialog-title" className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p id="dialog-description" className="text-sm text-gray-500">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || disabled}
              className={`
                px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${config.confirmBg} ${config.confirmText}
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center space-x-2
              `}
            >
              {isLoading && <LoadingSpinner size="sm" color="white" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Specialized delete confirmation dialog
interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  itemType?: string
  isLoading?: boolean
  additionalWarning?: string
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  isLoading = false,
  additionalWarning,
}) => {
  const message = additionalWarning
    ? `Are you sure you want to delete "${itemName}"? ${additionalWarning} This action cannot be undone.`
    : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemType}`}
      message={message}
      confirmText="Delete"
      cancelText="Cancel"
      type="danger"
      isLoading={isLoading}
    />
  )
}

// Specialized logout confirmation dialog
interface LogoutConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Sign Out"
      message="Are you sure you want to sign out? You'll need to sign in again to access your account."
      confirmText="Sign Out"
      cancelText="Cancel"
      type="info"
      isLoading={isLoading}
    />
  )
}

// Specialized approval confirmation dialog
interface ApprovalConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  action: 'approve' | 'reject'
  expenseAmount: string
  expenseDescription: string
  isLoading?: boolean
}

export const ApprovalConfirmDialog: React.FC<ApprovalConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  expenseAmount,
  expenseDescription,
  isLoading = false,
}) => {
  const isApproval = action === 'approve'
  
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={isApproval ? 'Approve Expense' : 'Reject Expense'}
      message={`Are you sure you want to ${action} this expense of ${expenseAmount} for "${expenseDescription}"?`}
      confirmText={isApproval ? 'Approve' : 'Reject'}
      cancelText="Cancel"
      type={isApproval ? 'info' : 'warning'}
      isLoading={isLoading}
    />
  )
}