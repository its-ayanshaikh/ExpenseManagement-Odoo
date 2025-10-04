import { useState, useCallback, useMemo } from 'react'
import { ValidationErrors, hasValidationErrors, getFieldError } from '../utils/errorHandling'

interface ValidationRule<T> {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: T) => string | null
  email?: boolean
  min?: number
  max?: number
}

interface FieldConfig<T> {
  rules?: ValidationRule<T>
  transform?: (value: any) => T
}

interface FormConfig<T> {
  [K in keyof T]: FieldConfig<T[K]>
}

interface UseFormValidationReturn<T> {
  values: T
  errors: ValidationErrors
  touched: { [K in keyof T]?: boolean }
  isValid: boolean
  isSubmitting: boolean
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  setError: (field: keyof T, error: string) => void
  clearError: (field: keyof T) => void
  setErrors: (errors: ValidationErrors) => void
  clearErrors: () => void
  validateField: (field: keyof T) => boolean
  validateAll: () => boolean
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>
  reset: (initialValues?: Partial<T>) => void
  setTouched: (field: keyof T, touched?: boolean) => void
  setSubmitting: (submitting: boolean) => void
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  config: FormConfig<T> = {} as FormConfig<T>
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrorsState] = useState<ValidationErrors>({})
  const [touched, setTouchedState] = useState<{ [K in keyof T]?: boolean }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation functions
  const validateValue = useCallback(<K extends keyof T>(field: K, value: T[K]): string | null => {
    const fieldConfig = config[field]
    if (!fieldConfig?.rules) return null

    const rules = fieldConfig.rules

    // Required validation
    if (rules.required && (value === null || value === undefined || value === '')) {
      return `${String(field)} is required`
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return null
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `${String(field)} must be at least ${rules.minLength} characters`
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return `${String(field)} must be no more than ${rules.maxLength} characters`
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        return `${String(field)} format is invalid`
      }

      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${String(field)} must be a valid email address`
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `${String(field)} must be at least ${rules.min}`
      }

      if (rules.max !== undefined && value > rules.max) {
        return `${String(field)} must be no more than ${rules.max}`
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value)
    }

    return null
  }, [config])

  const validateField = useCallback((field: keyof T): boolean => {
    const value = values[field]
    const error = validateValue(field, value)

    if (error) {
      setErrorsState(prev => ({
        ...prev,
        [field]: [error]
      }))
      return false
    } else {
      setErrorsState(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
      return true
    }
  }, [values, validateValue])

  const validateAll = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    Object.keys(values).forEach(field => {
      const error = validateValue(field as keyof T, values[field as keyof T])
      if (error) {
        newErrors[field] = [error]
        isValid = false
      }
    })

    setErrorsState(newErrors)
    return isValid
  }, [values, validateValue])

  // Form actions
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    const fieldConfig = config[field]
    const transformedValue = fieldConfig?.transform ? fieldConfig.transform(value) : value

    setValues(prev => ({
      ...prev,
      [field]: transformedValue
    }))

    // Clear error when value changes
    if (errors[field as string]) {
      setErrorsState(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [config, errors])

  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({
      ...prev,
      [field as string]: [error]
    }))
  }, [])

  const clearError = useCallback((field: keyof T) => {
    setErrorsState(prev => {
      const newErrors = { ...prev }
      delete newErrors[field as string]
      return newErrors
    })
  }, [])

  const setErrors = useCallback((newErrors: ValidationErrors) => {
    setErrorsState(newErrors)
  }, [])

  const clearErrors = useCallback(() => {
    setErrorsState({})
  }, [])

  const setTouched = useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouchedState(prev => ({
      ...prev,
      [field]: isTouched
    }))
  }, [])

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting)
  }, [])

  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }

      setIsSubmitting(true)
      
      try {
        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce((acc, key) => ({
          ...acc,
          [key]: true
        }), {})
        setTouchedState(allTouched)

        // Validate all fields
        const isValid = validateAll()
        
        if (isValid) {
          await onSubmit(values)
        }
      } catch (error) {
        // Handle submission errors
        console.error('Form submission error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [values, validateAll])

  const reset = useCallback((newInitialValues?: Partial<T>) => {
    const resetValues = newInitialValues ? { ...initialValues, ...newInitialValues } : initialValues
    setValues(resetValues)
    setErrorsState({})
    setTouchedState({})
    setIsSubmitting(false)
  }, [initialValues])

  // Computed values
  const isValid = useMemo(() => !hasValidationErrors(errors), [errors])

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setError,
    clearError,
    setErrors,
    clearErrors,
    validateField,
    validateAll,
    handleSubmit,
    reset,
    setTouched,
    setSubmitting,
  }
}

// Helper hook for getting field props
export function useFieldProps<T extends Record<string, any>>(
  form: UseFormValidationReturn<T>,
  field: keyof T
) {
  return {
    value: form.values[field],
    onChange: (value: T[typeof field]) => form.setValue(field, value),
    onBlur: () => {
      form.setTouched(field)
      form.validateField(field)
    },
    error: getFieldError(form.errors, field as string),
    touched: form.touched[field],
  }
}