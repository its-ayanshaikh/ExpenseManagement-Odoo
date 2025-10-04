import React, { useState, useEffect } from 'react'
import { runAccessibilityAudit, logAccessibilityIssues, testKeyboardNavigation, auditCurrentPage } from '../../utils/accessibilityTest'
import { useResponsive } from '../../hooks/useResponsive'
import { useReducedMotion } from '../../hooks/useAccessibility'

interface AccessibilityTesterProps {
  enabled?: boolean
}

/**
 * AccessibilityTester - Development tool for testing accessibility compliance
 * Only renders in development mode
 */
export const AccessibilityTester: React.FC<AccessibilityTesterProps> = ({
  enabled = true
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [auditResults, setAuditResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive()
  const prefersReducedMotion = useReducedMotion()

  // Only show in development mode
  if (!import.meta.env.DEV || !enabled) {
    return null
  }

  const runAudit = async () => {
    setIsRunning(true)
    try {
      const results = runAccessibilityAudit(document.body)
      setAuditResults(results)
      logAccessibilityIssues(results)
    } catch (error) {
      console.error('Accessibility audit failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const testKeyboard = () => {
    testKeyboardNavigation()
  }

  const auditPage = () => {
    auditCurrentPage()
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Toggle accessibility tester"
        title="Accessibility Tester"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Accessibility panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-purple-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-semibold">Accessibility Tester</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-200 focus:outline-none"
              aria-label="Close accessibility tester"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
            {/* Device info */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-sm mb-2">Device Info</h4>
              <div className="text-xs space-y-1">
                <div>Breakpoint: <span className="font-mono">{breakpoint}</span></div>
                <div>Mobile: {isMobile ? '✅' : '❌'}</div>
                <div>Tablet: {isTablet ? '✅' : '❌'}</div>
                <div>Desktop: {isDesktop ? '✅' : '❌'}</div>
                <div>Reduced Motion: {prefersReducedMotion ? '✅' : '❌'}</div>
              </div>
            </div>

            {/* Test buttons */}
            <div className="space-y-2">
              <button
                onClick={runAudit}
                disabled={isRunning}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isRunning ? 'Running Audit...' : 'Run Accessibility Audit'}
              </button>
              
              <button
                onClick={testKeyboard}
                className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Test Keyboard Navigation
              </button>
              
              <button
                onClick={auditPage}
                className="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Audit Current Page
              </button>
            </div>

            {/* Results */}
            {auditResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Audit Results ({auditResults.length} issues)
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {auditResults.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-xs ${getIssueColor(issue.type)}`}
                    >
                      <div className="font-medium">{issue.element}</div>
                      <div>{issue.message}</div>
                      {issue.suggestion && (
                        <div className="mt-1 italic">💡 {issue.suggestion}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-sm mb-2">Quick Tips</h4>
              <ul className="text-xs space-y-1">
                <li>• Use Tab to navigate through interactive elements</li>
                <li>• Use Shift+Tab to navigate backwards</li>
                <li>• Use Enter/Space to activate buttons</li>
                <li>• Use Arrow keys in menus and lists</li>
                <li>• Use Escape to close modals/menus</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Hook for accessibility testing utilities
 */
export const useAccessibilityTesting = () => {
  const runQuickAudit = React.useCallback(() => {
    if (import.meta.env.DEV) {
      const results = runAccessibilityAudit(document.body)
      console.group('🔍 Quick Accessibility Audit')
      logAccessibilityIssues(results)
      console.groupEnd()
      return results
    }
    return []
  }, [])

  const testCurrentKeyboardNav = React.useCallback(() => {
    if (import.meta.env.DEV) {
      testKeyboardNavigation()
    }
  }, [])

  const validateElement = React.useCallback((element: HTMLElement) => {
    if (import.meta.env.DEV) {
      const results = runAccessibilityAudit(element)
      console.group(`🔍 Element Accessibility Audit: ${element.tagName}`)
      logAccessibilityIssues(results)
      console.groupEnd()
      return results
    }
    return []
  }, [])

  return {
    runQuickAudit,
    testCurrentKeyboardNav,
    validateElement
  }
}

/**
 * Component for highlighting accessibility issues visually
 */
export const AccessibilityHighlighter: React.FC<{
  enabled?: boolean
  highlightType?: 'focus' | 'headings' | 'landmarks' | 'images' | 'forms'
}> = ({ enabled = false, highlightType = 'focus' }) => {
  useEffect(() => {
    if (!enabled || !import.meta.env.DEV) return

    const style = document.createElement('style')
    
    const highlightStyles = {
      focus: `
        *:focus {
          outline: 3px solid #ff6b6b !important;
          outline-offset: 2px !important;
        }
      `,
      headings: `
        h1, h2, h3, h4, h5, h6 {
          outline: 2px solid #4ecdc4 !important;
          outline-offset: 2px !important;
        }
        h1::before { content: "H1"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
        h2::before { content: "H2"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
        h3::before { content: "H3"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
        h4::before { content: "H4"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
        h5::before { content: "H5"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
        h6::before { content: "H6"; position: absolute; background: #4ecdc4; color: white; font-size: 10px; padding: 2px; }
      `,
      landmarks: `
        main, nav, header, footer, aside, section[role], [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"] {
          outline: 2px solid #45b7d1 !important;
          outline-offset: 2px !important;
        }
      `,
      images: `
        img:not([alt]), img[alt=""] {
          outline: 3px solid #ff6b6b !important;
          outline-offset: 2px !important;
        }
        img[alt] {
          outline: 2px solid #96ceb4 !important;
          outline-offset: 2px !important;
        }
      `,
      forms: `
        input:not([aria-label]):not([aria-labelledby]):not([id]) {
          outline: 3px solid #ff6b6b !important;
        }
        input[aria-label], input[aria-labelledby], input[id] {
          outline: 2px solid #96ceb4 !important;
        }
      `
    }

    style.textContent = highlightStyles[highlightType]
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [enabled, highlightType])

  return null
}