import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useEscapeKey, useFocusRestore } from '../../hooks/useAccessibility'
import { useResponsive } from '../../hooks/useResponsive'
import { TouchTarget } from '../layout/ResponsiveContainer'

interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
  titleId?: string
  describedBy?: string
}

/**
 * AccessibleModal provides a fully accessible modal dialog with proper focus management
 */
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  titleId,
  describedBy
}) => {
  const { isMobile } = useResponsive()
  const modalRef = useFocusTrap(isOpen)
  const { saveFocus, restoreFocus } = useFocusRestore()

  // Handle escape key
  useEscapeKey(onClose, closeOnEscape && isOpen)

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      saveFocus()
    } else {
      restoreFocus()
    }
  }, [isOpen, saveFocus, restoreFocus])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId || 'modal-title'}
      aria-describedby={describedBy}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef as React.RefObject<HTMLDivElement>}
          className={`
            relative w-full ${sizeClasses[size]} transform overflow-hidden 
            rounded-lg bg-white shadow-xl transition-all
            ${isMobile ? 'mx-4' : ''}
            ${className}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2
              id={titleId || 'modal-title'}
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
            
            <TouchTarget
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-400 hover:text-gray-600 focus:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </TouchTarget>
          </div>

          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

interface ModalActionsProps {
  children: React.ReactNode
  className?: string
}

/**
 * ModalActions provides consistent styling for modal action buttons
 */
export const ModalActions: React.FC<ModalActionsProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`flex justify-end space-x-3 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

interface ModalButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * ModalButton provides accessible buttons for modal actions
 */
export const ModalButton: React.FC<ModalButtonProps> = ({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  loading = false,
  className = '',
  'aria-label': ariaLabel
}) => {
  const { isMobile } = useResponsive()

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center px-4 py-2 border border-transparent
        text-sm font-medium rounded-md transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isMobile ? 'min-h-12' : 'min-h-10'}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

/**
 * Hook for managing modal state with accessibility considerations
 */
export const useAccessibleModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(initialOpen)

  const openModal = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleModal = React.useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  }
}