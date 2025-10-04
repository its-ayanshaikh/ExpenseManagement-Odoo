/**
 * Accessibility utilities for the expense management system
 */

// ARIA live region announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus management utilities
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }

  element.addEventListener('keydown', handleTabKey)
  
  // Focus first element
  firstElement?.focus()

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

// Generate unique IDs for form elements
let idCounter = 0
export const generateId = (prefix: string = 'id'): string => {
  idCounter++
  return `${prefix}-${idCounter}`
}

// Keyboard navigation helpers
export const handleEscapeKey = (callback: () => void) => {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      callback()
    }
  }
}

export const handleEnterKey = (callback: () => void) => {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      callback()
    }
  }
}

// Screen reader text utilities
export const getScreenReaderText = (text: string): string => {
  return text
}

// Color contrast utilities
export const getContrastColor = (backgroundColor: string): 'light' | 'dark' => {
  // Simple heuristic - in a real app, you'd use a proper color contrast calculation
  const darkColors = ['red', 'blue', 'green', 'purple', 'indigo', 'gray-900', 'gray-800']
  return darkColors.some(color => backgroundColor.includes(color)) ? 'light' : 'dark'
}

// Validation for accessibility requirements
export const validateAccessibility = (element: HTMLElement): string[] => {
  const issues: string[] = []
  
  // Check for missing alt text on images
  const images = element.querySelectorAll('img')
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push('Image missing alt text or aria-label')
    }
  })
  
  // Check for missing labels on form inputs
  const inputs = element.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    element.querySelector(`label[for="${input.id}"]`)
    if (!hasLabel) {
      issues.push('Form input missing label')
    }
  })
  
  // Check for missing headings structure
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length === 0) {
    issues.push('No heading structure found')
  }
  
  return issues
}

// Mobile touch target size validation
export const validateTouchTargets = (element: HTMLElement): string[] => {
  const issues: string[] = []
  const interactiveElements = element.querySelectorAll('button, a, input, select, textarea')
  
  interactiveElements.forEach(el => {
    const rect = el.getBoundingClientRect()
    const minSize = 44 // 44px minimum touch target size
    
    if (rect.width < minSize || rect.height < minSize) {
      issues.push(`Touch target too small: ${rect.width}x${rect.height}px (minimum: ${minSize}px)`)
    }
  })
  
  return issues
}

// ARIA attributes helpers
export const getAriaAttributes = (props: {
  label?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
}) => {
  const attributes: Record<string, string | boolean> = {}
  
  if (props.label) attributes['aria-label'] = props.label
  if (props.describedBy) attributes['aria-describedby'] = props.describedBy
  if (props.expanded !== undefined) attributes['aria-expanded'] = props.expanded
  if (props.selected !== undefined) attributes['aria-selected'] = props.selected
  if (props.disabled) attributes['aria-disabled'] = true
  if (props.required) attributes['aria-required'] = true
  if (props.invalid) attributes['aria-invalid'] = true
  if (props.live) attributes['aria-live'] = props.live
  if (props.atomic !== undefined) attributes['aria-atomic'] = props.atomic
  
  return attributes
}