import React from 'react'
import { useResponsive } from '../../hooks/useResponsive'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  centerContent?: boolean
}

/**
 * ResponsiveContainer provides consistent responsive behavior across the app
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md',
  centerContent = true
}) => {
  const { isMobile, isTablet } = useResponsive()

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2 sm:px-4 sm:py-4',
    md: 'px-4 py-4 sm:px-6 sm:py-6',
    lg: 'px-6 py-6 sm:px-8 sm:py-8'
  }

  return (
    <div
      className={`
        w-full
        ${maxWidthClasses[maxWidth]}
        ${paddingClasses[padding]}
        ${centerContent ? 'mx-auto' : ''}
        ${className}
      `}
      data-mobile={isMobile}
      data-tablet={isTablet}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * ResponsiveGrid provides responsive grid layouts with mobile-first approach
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const getGridCols = () => {
    const colClasses = []
    if (columns.xs) colClasses.push(`grid-cols-${columns.xs}`)
    if (columns.sm) colClasses.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) colClasses.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) colClasses.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) colClasses.push(`xl:grid-cols-${columns.xl}`)
    return colClasses.join(' ')
  }

  return (
    <div
      className={`
        grid
        ${getGridCols()}
        ${gapClasses[gap]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface ResponsiveStackProps {
  children: React.ReactNode
  direction?: 'vertical' | 'horizontal' | 'responsive'
  spacing?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  className?: string
}

/**
 * ResponsiveStack provides flexible stacking layouts that adapt to screen size
 */
export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = 'responsive',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  className = ''
}) => {
  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  }

  const directionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row',
    responsive: 'flex-col sm:flex-row'
  }

  return (
    <div
      className={`
        flex
        ${directionClasses[direction]}
        ${spacingClasses[spacing]}
        ${alignClasses[align]}
        ${justifyClasses[justify]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface TouchTargetProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
  'aria-label'?: string
}

/**
 * TouchTarget ensures interactive elements meet minimum touch target requirements
 */
export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  'aria-label': ariaLabel
}) => {
  const { isMobile } = useResponsive()

  const sizeClasses = {
    sm: isMobile ? 'min-h-11 min-w-11' : 'min-h-8 min-w-8',
    md: isMobile ? 'min-h-12 min-w-12' : 'min-h-10 min-w-10',
    lg: isMobile ? 'min-h-14 min-w-14' : 'min-h-12 min-w-12'
  }

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  )
}

interface VisuallyHiddenProps {
  children: React.ReactNode
  focusable?: boolean
}

/**
 * VisuallyHidden hides content visually but keeps it available to screen readers
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  focusable = false
}) => {
  return (
    <span
      className={focusable ? 'sr-only focus:not-sr-only' : 'sr-only'}
    >
      {children}
    </span>
  )
}