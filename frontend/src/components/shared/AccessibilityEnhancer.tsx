import React, { useEffect, useRef } from 'react'
import { useResponsive } from '../../hooks/useResponsive'
import { useReducedMotion } from '../../hooks/useAccessibility'
import { runAccessibilityAudit, logAccessibilityIssues } from '../../utils/accessibilityTest'

interface AccessibilityEnhancerProps {
  children: React.ReactNode
  enableAudit?: boolean
  className?: string
}

/**
 * AccessibilityEnhancer component that wraps content with accessibility improvements
 * and provides runtime accessibility validation in development mode
 */
export const AccessibilityEnhancer: React.FC<AccessibilityEnhancerProps> = ({
  children,
  enableAudit = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isMobile } = useResponsive()
  const prefersReducedMotion = useReducedMotion()

  // Run accessibility audit in development mode
  useEffect(() => {
    if (enableAudit && import.meta.env.DEV && containerRef.current) {
      const timer = setTimeout(() => {
        const issues = runAccessibilityAudit(containerRef.current!)
        if (issues.length > 0) {
          console.group('🔍 Accessibility Issues Found')
          logAccessibilityIssues(issues)
          console.groupEnd()
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [enableAudit])

  // Add global CSS custom properties for responsive and accessibility states
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--is-mobile', isMobile ? '1' : '0')
    root.style.setProperty('--prefers-reduced-motion', prefersReducedMotion ? '1' : '0')
  }, [isMobile, prefersReducedMotion])

  return (
    <div
      ref={containerRef}
      className={`accessibility-enhanced ${className}`}
      data-mobile={isMobile}
      data-reduced-motion={prefersReducedMotion}
    >
      {children}
    </div>
  )
}

/**
 * Hook to provide accessibility context and utilities
 */
export const useAccessibilityContext = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const prefersReducedMotion = useReducedMotion()

  return {
    isMobile,
    isTablet,
    isDesktop,
    prefersReducedMotion,
    // Utility functions
    getAriaLabel: (base: string, context?: string) => {
      return context ? `${base}, ${context}` : base
    },
    getResponsiveAriaLabel: (mobileLabel: string, desktopLabel: string) => {
      return isMobile ? mobileLabel : desktopLabel
    },
    shouldReduceMotion: () => prefersReducedMotion,
    getTouchTargetSize: () => isMobile ? 'min-h-12 min-w-12' : 'min-h-11 min-w-11'
  }
}

/**
 * Component for creating accessible skip links
 */
export const SkipLink: React.FC<{
  href: string
  children: React.ReactNode
  className?: string
}> = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white 
        focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 
        focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200
        ${className}
      `}
    >
      {children}
    </a>
  )
}

/**
 * Component for creating accessible landmarks
 */
export const Landmark: React.FC<{
  role: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary' | 'region'
  'aria-label'?: string
  'aria-labelledby'?: string
  children: React.ReactNode
  className?: string
}> = ({ role, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, children, className = '' }) => {
  const Tag = role === 'main' ? 'main' : role === 'navigation' ? 'nav' : 'section'

  return (
    <Tag
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={className}
    >
      {children}
    </Tag>
  )
}

/**
 * Component for creating accessible headings with proper hierarchy
 */
export const AccessibleHeading: React.FC<{
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
  id?: string
}> = ({ level, children, className = '', id }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  )
}

/**
 * Component for creating accessible live regions
 */
export const LiveRegion: React.FC<{
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}> = ({ 
  children, 
  politeness = 'polite', 
  atomic = true, 
  relevant = 'all',
  className = '' 
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {children}
    </div>
  )
}

/**
 * Component for creating accessible status messages
 */
export const StatusMessage: React.FC<{
  children: React.ReactNode
  type?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}> = ({ children, type = 'info', className = '' }) => {
  const roleMap = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert'
  }

  const colorMap = {
    info: 'text-blue-800 bg-blue-50 border-blue-200',
    success: 'text-green-800 bg-green-50 border-green-200',
    warning: 'text-yellow-800 bg-yellow-50 border-yellow-200',
    error: 'text-red-800 bg-red-50 border-red-200'
  }

  return (
    <div
      role={roleMap[type]}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      className={`
        p-4 border rounded-md ${colorMap[type]} ${className}
      `}
    >
      {children}
    </div>
  )
}