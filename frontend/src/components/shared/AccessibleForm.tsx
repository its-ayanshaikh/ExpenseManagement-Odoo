import React from 'react'
import { useResponsive } from '../../hooks/useResponsive'
import { useId } from '../../hooks/useAccessibility'
import { StatusMessage } from './AccessibilityEnhancer'
import { ResponsiveStack } from '../layout/ResponsiveContainer'

interface AccessibleFormProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  title?: string
  description?: string
  error?: string
  loading?: boolean
  className?: string
  noValidate?: boolean
}

/**
 * AccessibleForm provides a form wrapper with proper accessibility features
 */
export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  title,
  description,
  error,
  loading = false,
  className = '',
  noValidate = true
}) => {
  const formId = useId('form')
  const titleId = useId('form-title')
  const descriptionId = useId('form-description')
  const errorId = useId('form-error')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loading) {
      onSubmit(e)
    }
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={`${description ? descriptionId : ''} ${error ? errorId : ''}`.trim() || undefined}
      className={`space-y-6 ${className}`}
    >
      {title && (
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
      )}

      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}

      {error && (
        <StatusMessage type="error" className="mb-4">
          <div id={errorId}>{error}</div>
        </StatusMessage>
      )}

      <fieldset disabled={loading} className="space-y-6">
        {loading && <span className="sr-only">Form is loading</span>}
        {children}
      </fieldset>
    </form>
  )
}

interface FormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * FormSection groups related form fields with proper semantic structure
 */
export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  description,
  className = ''
}) => {
  const titleId = useId('section-title')
  const descriptionId = useId('section-description')

  return (
    <fieldset
      className={`space-y-4 ${className}`}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {title && (
        <legend id={titleId} className="text-base font-medium text-gray-900">
          {title}
        </legend>
      )}

      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}

      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  )
}

interface FormActionsProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  stack?: boolean
  className?: string
}

/**
 * FormActions provides consistent styling and layout for form action buttons
 */
export const FormActions: React.FC<FormActionsProps> = ({
  children,
  align = 'end',
  stack = false,
  className = ''
}) => {
  const { isMobile } = useResponsive()

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end'
  }

  return (
    <div className={`pt-6 border-t border-gray-200 ${className}`}>
      <ResponsiveStack
        direction={stack || isMobile ? 'vertical' : 'horizontal'}
        spacing="md"
        justify={align}
        className={!stack && !isMobile ? alignClasses[align] : ''}
      >
        {children}
      </ResponsiveStack>
    </div>
  )
}

interface FormButtonProps {
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

/**
 * FormButton provides accessible buttons with proper touch targets
 */
export const FormButton: React.FC<FormButtonProps> = ({
  children,
  type = 'button',
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy
}) => {
  const { isMobile } = useResponsive()

  const variantClasses = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-blue-500'
  }

  const sizeClasses = {
    sm: isMobile ? 'px-3 py-2 text-sm min-h-11' : 'px-3 py-1.5 text-sm min-h-8',
    md: isMobile ? 'px-4 py-2 text-base min-h-12' : 'px-4 py-2 text-sm min-h-10',
    lg: isMobile ? 'px-6 py-3 text-lg min-h-14' : 'px-6 py-3 text-base min-h-12'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`
        inline-flex items-center justify-center border font-medium rounded-md
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading && (
        <>
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
          <span className="sr-only">Loading</span>
        </>
      )}
      {children}
    </button>
  )
}

interface FormFieldGroupProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

/**
 * FormFieldGroup arranges form fields in responsive columns
 */
export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  children,
  columns = 1,
  className = ''
}) => {
  const { isMobile } = useResponsive()

  const getGridCols = () => {
    if (isMobile) return 'grid-cols-1'
    
    switch (columns) {
      case 2: return 'grid-cols-1 md:grid-cols-2'
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      default: return 'grid-cols-1'
    }
  }

  return (
    <div className={`grid ${getGridCols()} gap-4 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Hook for managing form accessibility state
 */
export const useFormAccessibility = () => {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const setFieldError = React.useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearFieldError = React.useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const setFieldTouched = React.useCallback((field: string, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }))
  }, [])

  const getFieldProps = React.useCallback((field: string) => ({
    error: errors[field],
    touched: touched[field],
    onBlur: () => setFieldTouched(field, true)
  }), [errors, touched, setFieldTouched])

  const hasErrors = Object.keys(errors).length > 0
  const isValid = !hasErrors

  return {
    errors,
    touched,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    getFieldProps,
    hasErrors,
    isValid
  }
}