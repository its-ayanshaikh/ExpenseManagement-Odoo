import React from 'react'
import { InlineError } from './ErrorMessage'
import { InlineSpinner } from './LoadingSpinner'
import { useId } from '../../hooks/useAccessibility'

interface BaseFieldProps {
  label?: string
  error?: string
  touched?: boolean
  required?: boolean
  disabled?: boolean
  loading?: boolean
  helpText?: string
  className?: string
  labelClassName?: string
  inputClassName?: string
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  maxLength?: number
  minLength?: number
  autoComplete?: string
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  touched,
  required,
  disabled,
  loading,
  helpText,
  className = '',
  labelClassName = '',
  inputClassName = '',
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  minLength,
  autoComplete,
}) => {
  const hasError = touched && error
  const fieldId = useId('textfield')
  const errorId = useId('error')
  const helpId = useId('help')
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled || loading}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm min-h-11
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
            ${inputClassName}
          `}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
            <InlineSpinner size="sm" />
          </div>
        )}
      </div>
      
      {helpText && !hasError && (
        <p id={helpId} className="text-sm text-gray-500">{helpText}</p>
      )}
      
      {hasError && <InlineError message={error} />}
    </div>
  )
}

interface NumberFieldProps extends BaseFieldProps {
  value: number | ''
  onChange: (value: number | '') => void
  onBlur?: () => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  error,
  touched,
  required,
  disabled,
  loading,
  helpText,
  className = '',
  labelClassName = '',
  inputClassName = '',
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  step,
}) => {
  const hasError = touched && error
  const fieldId = useId('numberfield')
  const errorId = useId('error')
  const helpId = useId('help')
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange('')
    } else {
      const numVal = parseFloat(val)
      if (!isNaN(numVal)) {
        onChange(numVal)
      }
    }
  }
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={fieldId}
          type="number"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled || loading}
          min={min}
          max={max}
          step={step}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm min-h-11
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
            ${inputClassName}
          `}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
            <InlineSpinner size="sm" />
          </div>
        )}
      </div>
      
      {helpText && !hasError && (
        <p id={helpId} className="text-sm text-gray-500">{helpText}</p>
      )}
      
      {hasError && <InlineError message={error} />}
    </div>
  )
}

interface SelectFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  error,
  touched,
  required,
  disabled,
  loading,
  helpText,
  className = '',
  labelClassName = '',
  inputClassName = '',
  value,
  onChange,
  onBlur,
  options,
  placeholder,
}) => {
  const hasError = touched && error
  const fieldId = useId('selectfield')
  const errorId = useId('error')
  const helpId = useId('help')
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled || loading}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm min-h-11
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
            ${inputClassName}
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {loading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2" aria-hidden="true">
            <InlineSpinner size="sm" />
          </div>
        )}
      </div>
      
      {helpText && !hasError && (
        <p id={helpId} className="text-sm text-gray-500">{helpText}</p>
      )}
      
      {hasError && <InlineError message={error} />}
    </div>
  )
}

interface TextAreaFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  rows?: number
  maxLength?: number
  minLength?: number
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  error,
  touched,
  required,
  disabled,
  loading,
  helpText,
  className = '',
  labelClassName = '',
  inputClassName = '',
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  maxLength,
  minLength,
}) => {
  const hasError = touched && error
  const fieldId = useId('textarea')
  const errorId = useId('error')
  const helpId = useId('help')
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled || loading}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm resize-vertical
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
            ${inputClassName}
          `}
        />
        
        {loading && (
          <div className="absolute right-3 top-3" aria-hidden="true">
            <InlineSpinner size="sm" />
          </div>
        )}
      </div>
      
      {maxLength && (
        <div className="flex justify-between text-sm text-gray-500">
          <span id={helpId}>{helpText}</span>
          <span aria-live="polite">{value.length}/{maxLength}</span>
        </div>
      )}
      
      {!maxLength && helpText && !hasError && (
        <p id={helpId} className="text-sm text-gray-500">{helpText}</p>
      )}
      
      {hasError && <InlineError message={error} />}
    </div>
  )
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  onBlur?: () => void
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  error,
  touched,
  required,
  disabled,
  loading,
  helpText,
  className = '',
  labelClassName = '',
  checked,
  onChange,
  onBlur,
}) => {
  const hasError = touched && error
  const fieldId = useId('checkbox')
  const errorId = useId('error')
  const helpId = useId('help')
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={fieldId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            disabled={disabled || loading}
            required={required}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={`${hasError ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
            className={`
              w-4 h-4 text-blue-600 border-gray-300 rounded min-w-4 min-h-4
              focus:ring-blue-500 focus:ring-2 focus:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              ${hasError ? 'border-red-300' : ''}
            `}
          />
        </div>
        
        {label && (
          <div className="ml-3 text-sm">
            <label 
              htmlFor={fieldId}
              className={`font-medium text-gray-700 cursor-pointer ${labelClassName}`}
            >
              {label}
              {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>
            {helpText && !hasError && (
              <p id={helpId} className="text-gray-500">{helpText}</p>
            )}
          </div>
        )}
        
        {loading && (
          <div className="ml-2" aria-hidden="true">
            <InlineSpinner size="xs" />
          </div>
        )}
      </div>
      
      {hasError && <InlineError message={error} />}
    </div>
  )
}