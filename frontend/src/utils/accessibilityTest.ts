/**
 * Accessibility testing utilities
 * These functions help validate accessibility compliance during development
 */

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  element: string
  message: string
  suggestion?: string
}

export const runAccessibilityAudit = (container: HTMLElement): AccessibilityIssue[] => {
  const issues: AccessibilityIssue[] = []

  // Check for missing alt text on images
  const images = container.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
      issues.push({
        type: 'error',
        element: `img[${index}]`,
        message: 'Image missing alt text',
        suggestion: 'Add alt attribute or aria-label to describe the image content'
      })
    }
  })

  // Check for missing labels on form inputs
  const inputs = container.querySelectorAll('input, select, textarea')
  inputs.forEach((input, index) => {
    const inputElement = input as HTMLInputElement
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    container.querySelector(`label[for="${input.id}"]`) ||
                    input.closest('label')
    
    if (!hasLabel && inputElement.type !== 'hidden') {
      issues.push({
        type: 'error',
        element: `${input.tagName.toLowerCase()}[${index}]`,
        message: 'Form input missing label',
        suggestion: 'Add a label element, aria-label, or aria-labelledby attribute'
      })
    }
  })

  // Check for proper heading hierarchy
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  if (headings.length > 0) {
    let previousLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      if (index === 0 && level !== 1) {
        issues.push({
          type: 'warning',
          element: heading.tagName.toLowerCase(),
          message: 'Page should start with h1',
          suggestion: 'Use h1 for the main page heading'
        })
      } else if (level > previousLevel + 1) {
        issues.push({
          type: 'warning',
          element: heading.tagName.toLowerCase(),
          message: `Heading level skipped (h${previousLevel} to h${level})`,
          suggestion: 'Use sequential heading levels for proper document structure'
        })
      }
      previousLevel = level
    })
  }

  // Check for buttons without accessible names
  const buttons = container.querySelectorAll('button')
  buttons.forEach((button, index) => {
    const hasAccessibleName = button.textContent?.trim() ||
                             button.getAttribute('aria-label') ||
                             button.getAttribute('aria-labelledby') ||
                             button.querySelector('img[alt]')
    
    if (!hasAccessibleName) {
      issues.push({
        type: 'error',
        element: `button[${index}]`,
        message: 'Button missing accessible name',
        suggestion: 'Add text content, aria-label, or aria-labelledby attribute'
      })
    }
  })

  // Check for links without accessible names
  const links = container.querySelectorAll('a')
  links.forEach((link, index) => {
    const hasAccessibleName = link.textContent?.trim() ||
                             link.getAttribute('aria-label') ||
                             link.getAttribute('aria-labelledby') ||
                             link.querySelector('img[alt]')
    
    if (!hasAccessibleName) {
      issues.push({
        type: 'error',
        element: `a[${index}]`,
        message: 'Link missing accessible name',
        suggestion: 'Add text content, aria-label, or aria-labelledby attribute'
      })
    }
  })

  // Check for proper focus indicators
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  focusableElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element)
    const hasFocusStyle = computedStyle.outlineStyle !== 'none' || 
                         element.classList.contains('focus:ring') ||
                         element.classList.contains('focus:outline')
    
    if (!hasFocusStyle) {
      issues.push({
        type: 'warning',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: 'Element may lack visible focus indicator',
        suggestion: 'Ensure focusable elements have visible focus styles'
      })
    }
  })

  // Check for minimum touch target sizes (44x44px)
  const interactiveElements = container.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]')
  interactiveElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect()
    const minSize = 44
    
    if (rect.width > 0 && rect.height > 0 && (rect.width < minSize || rect.height < minSize)) {
      issues.push({
        type: 'warning',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
        suggestion: `Ensure interactive elements are at least ${minSize}x${minSize}px`
      })
    }
  })

  // Check for proper ARIA usage
  const elementsWithAria = container.querySelectorAll('[aria-expanded], [aria-selected], [aria-checked]')
  elementsWithAria.forEach((element, index) => {
    const ariaExpanded = element.getAttribute('aria-expanded')
    const ariaSelected = element.getAttribute('aria-selected')
    const ariaChecked = element.getAttribute('aria-checked')
    
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      issues.push({
        type: 'error',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: 'Invalid aria-expanded value',
        suggestion: 'Use "true" or "false" for aria-expanded'
      })
    }
    
    if (ariaSelected && !['true', 'false'].includes(ariaSelected)) {
      issues.push({
        type: 'error',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: 'Invalid aria-selected value',
        suggestion: 'Use "true" or "false" for aria-selected'
      })
    }
    
    if (ariaChecked && !['true', 'false', 'mixed'].includes(ariaChecked)) {
      issues.push({
        type: 'error',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: 'Invalid aria-checked value',
        suggestion: 'Use "true", "false", or "mixed" for aria-checked'
      })
    }
  })

  // Check for color contrast (basic check)
  const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button, a')
  textElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element)
    const color = computedStyle.color
    const backgroundColor = computedStyle.backgroundColor
    
    // Basic check for very light text on light backgrounds
    if (color.includes('rgb(255') && backgroundColor.includes('rgb(255')) {
      issues.push({
        type: 'warning',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        message: 'Potential color contrast issue',
        suggestion: 'Verify color contrast meets WCAG AA standards (4.5:1 for normal text)'
      })
    }
  })

  return issues
}

export const logAccessibilityIssues = (issues: AccessibilityIssue[]) => {
  if (issues.length === 0) {
    console.log('✅ No accessibility issues found!')
    return
  }

  console.group('🔍 Accessibility Audit Results')
  
  const errors = issues.filter(issue => issue.type === 'error')
  const warnings = issues.filter(issue => issue.type === 'warning')
  const info = issues.filter(issue => issue.type === 'info')

  if (errors.length > 0) {
    console.group(`❌ ${errors.length} Error(s)`)
    errors.forEach(issue => {
      console.error(`${issue.element}: ${issue.message}`)
      if (issue.suggestion) {
        console.log(`💡 ${issue.suggestion}`)
      }
    })
    console.groupEnd()
  }

  if (warnings.length > 0) {
    console.group(`⚠️ ${warnings.length} Warning(s)`)
    warnings.forEach(issue => {
      console.warn(`${issue.element}: ${issue.message}`)
      if (issue.suggestion) {
        console.log(`💡 ${issue.suggestion}`)
      }
    })
    console.groupEnd()
  }

  if (info.length > 0) {
    console.group(`ℹ️ ${info.length} Info`)
    info.forEach(issue => {
      console.info(`${issue.element}: ${issue.message}`)
      if (issue.suggestion) {
        console.log(`💡 ${issue.suggestion}`)
      }
    })
    console.groupEnd()
  }

  console.groupEnd()
}

// Development helper to run accessibility audit on current page
export const auditCurrentPage = () => {
  if (import.meta.env.DEV) {
    setTimeout(() => {
      const issues = runAccessibilityAudit(document.body)
      logAccessibilityIssues(issues)
    }, 1000) // Wait for page to render
  }
}

// Keyboard navigation test helper
export const testKeyboardNavigation = () => {
  if (import.meta.env.DEV) {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    console.group('⌨️ Keyboard Navigation Test')
    console.log(`Found ${focusableElements.length} focusable elements`)
    
    focusableElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      const isVisible = rect.width > 0 && rect.height > 0
      const hasTabIndex = element.hasAttribute('tabindex')
      const tabIndex = element.getAttribute('tabindex')
      
      console.log(`${index + 1}. ${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`, {
        visible: isVisible,
        tabIndex: hasTabIndex ? tabIndex : 'default',
        text: element.textContent?.trim().substring(0, 50) || 'No text'
      })
    })
    
    console.log('💡 Use Tab key to navigate through these elements')
    console.groupEnd()
  }
}