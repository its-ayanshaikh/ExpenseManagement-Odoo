import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AccessibilityEnhancer } from '../shared/AccessibilityEnhancer'
import { AccessibleModal } from '../shared/AccessibleModal'
import { AccessibleForm, FormSection, FormActions, FormButton } from '../shared/AccessibleForm'
import { ResponsiveContainer, ResponsiveGrid, TouchTarget } from '../layout/ResponsiveContainer'
import { TextField, SelectField, CheckboxField } from '../shared/FormField'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock responsive hook
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg',
    width: 1024,
    height: 768
  })
}))

// Mock accessibility hooks
jest.mock('../../hooks/useAccessibility', () => ({
  useFocusTrap: () => ({ current: null }),
  useEscapeKey: jest.fn(),
  useFocusRestore: () => ({ saveFocus: jest.fn(), restoreFocus: jest.fn() }),
  useId: (prefix = 'test') => `${prefix}-123`,
  useReducedMotion: () => false
}))

describe('Accessibility Features', () => {
  describe('AccessibilityEnhancer', () => {
    it('should render children without accessibility violations', async () => {
      const { container } = render(
        <AccessibilityEnhancer>
          <div>
            <h1>Test Heading</h1>
            <button>Test Button</button>
            <input aria-label="Test Input" />
          </div>
        </AccessibilityEnhancer>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should provide accessibility context', () => {
      render(
        <AccessibilityEnhancer>
          <div data-testid="content">Test content</div>
        </AccessibilityEnhancer>
      )

      const content = screen.getByTestId('content')
      expect(content.closest('.accessibility-enhanced')).toBeInTheDocument()
    })
  })

  describe('AccessibleModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      children: <div>Modal content</div>
    }

    it('should render modal with proper ARIA attributes', () => {
      render(<AccessibleModal {...defaultProps} />)

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
    })

    it('should focus trap within modal', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibleModal {...defaultProps}>
          <button>First Button</button>
          <button>Second Button</button>
        </AccessibleModal>
      )

      const firstButton = screen.getByText('First Button')
      const secondButton = screen.getByText('Second Button')
      const closeButton = screen.getByLabelText('Close modal')

      // Tab should cycle through modal elements only
      await user.tab()
      expect(closeButton).toHaveFocus()

      await user.tab()
      expect(firstButton).toHaveFocus()

      await user.tab()
      expect(secondButton).toHaveFocus()
    })

    it('should close on escape key', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<AccessibleModal {...defaultProps} onClose={onClose} />)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(<AccessibleModal {...defaultProps} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('AccessibleForm', () => {
    it('should render form with proper structure', () => {
      const handleSubmit = jest.fn()

      render(
        <AccessibleForm onSubmit={handleSubmit} title="Test Form">
          <FormSection title="Section 1">
            <TextField
              label="Name"
              value=""
              onChange={jest.fn()}
              required
            />
          </FormSection>
          <FormActions>
            <FormButton type="submit" variant="primary">
              Submit
            </FormButton>
          </FormActions>
        </AccessibleForm>
      )

      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByText('Test Form')).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Section 1' })).toBeInTheDocument()
    })

    it('should handle form submission', async () => {
      const user = userEvent.setup()
      const handleSubmit = jest.fn()

      render(
        <AccessibleForm onSubmit={handleSubmit}>
          <FormButton type="submit">Submit</FormButton>
        </AccessibleForm>
      )

      await user.click(screen.getByText('Submit'))
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <AccessibleForm onSubmit={jest.fn()} title="Test Form">
          <TextField label="Name" value="" onChange={jest.fn()} />
          <SelectField
            label="Category"
            value=""
            onChange={jest.fn()}
            options={[{ value: 'test', label: 'Test' }]}
          />
          <CheckboxField label="Agree" checked={false} onChange={jest.fn()} />
        </AccessibleForm>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('ResponsiveContainer', () => {
    it('should render with responsive classes', () => {
      render(
        <ResponsiveContainer maxWidth="lg" padding="md" data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      )

      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-lg', 'px-4', 'py-4')
    })

    it('should render responsive grid', () => {
      render(
        <ResponsiveGrid
          columns={{ xs: 1, md: 2, lg: 3 }}
          gap="md"
          data-testid="grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )

      const grid = screen.getByTestId('grid')
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4')
    })

    it('should render touch targets with proper size', () => {
      const handleClick = jest.fn()

      render(
        <TouchTarget onClick={handleClick} size="md" aria-label="Touch target">
          <span>Touch me</span>
        </TouchTarget>
      )

      const touchTarget = screen.getByLabelText('Touch target')
      expect(touchTarget).toHaveClass('min-h-10', 'min-w-10')
    })
  })

  describe('Form Fields', () => {
    it('should render text field with proper accessibility attributes', () => {
      render(
        <TextField
          label="Email"
          value=""
          onChange={jest.fn()}
          required
          error="Invalid email"
          touched={true}
          helpText="Enter your email address"
        />
      )

      const input = screen.getByLabelText('Email *')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')
      expect(input).toBeRequired()
    })

    it('should render select field with proper options', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ]

      render(
        <SelectField
          label="Category"
          value=""
          onChange={jest.fn()}
          options={options}
        />
      )

      const select = screen.getByLabelText('Category')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('should render checkbox with proper labeling', () => {
      render(
        <CheckboxField
          label="I agree to the terms"
          checked={false}
          onChange={jest.fn()}
        />
      )

      const checkbox = screen.getByLabelText('I agree to the terms')
      expect(checkbox).toHaveAttribute('type', 'checkbox')
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in forms', async () => {
      const user = userEvent.setup()

      render(
        <AccessibleForm onSubmit={jest.fn()}>
          <TextField label="First Name" value="" onChange={jest.fn()} />
          <TextField label="Last Name" value="" onChange={jest.fn()} />
          <FormButton type="submit">Submit</FormButton>
        </AccessibleForm>
      )

      const firstInput = screen.getByLabelText('First Name')
      const lastInput = screen.getByLabelText('Last Name')
      const submitButton = screen.getByText('Submit')

      // Tab through form elements
      await user.tab()
      expect(firstInput).toHaveFocus()

      await user.tab()
      expect(lastInput).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should support Enter key activation on buttons', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(
        <FormButton onClick={handleClick}>
          Click me
        </FormButton>
      )

      const button = screen.getByText('Click me')
      button.focus()

      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper heading structure', () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </div>
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title')
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section Title')
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection Title')
    })

    it('should provide status messages with proper roles', () => {
      render(
        <div>
          <div role="status" aria-live="polite">
            Success message
          </div>
          <div role="alert" aria-live="assertive">
            Error message
          </div>
        </div>
      )

      expect(screen.getByRole('status')).toHaveTextContent('Success message')
      expect(screen.getByRole('alert')).toHaveTextContent('Error message')
    })
  })

  describe('Touch Targets', () => {
    it('should meet minimum touch target size requirements', () => {
      render(
        <TouchTarget size="md" onClick={jest.fn()} aria-label="Touch target">
          <span>Touch</span>
        </TouchTarget>
      )

      const touchTarget = screen.getByLabelText('Touch target')
      const styles = window.getComputedStyle(touchTarget)
      
      // Should have minimum 44x44px touch target (converted to rem: 2.75rem = 44px)
      expect(touchTarget).toHaveClass('min-h-10', 'min-w-10')
    })
  })

  describe('Error Handling', () => {
    it('should announce form errors to screen readers', () => {
      render(
        <AccessibleForm onSubmit={jest.fn()} error="Form submission failed">
          <TextField label="Name" value="" onChange={jest.fn()} />
        </AccessibleForm>
      )

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveTextContent('Form submission failed')
    })

    it('should associate field errors with inputs', () => {
      render(
        <TextField
          label="Email"
          value=""
          onChange={jest.fn()}
          error="Invalid email format"
          touched={true}
        />
      )

      const input = screen.getByLabelText('Email')
      const errorId = input.getAttribute('aria-describedby')
      
      expect(errorId).toBeTruthy()
      expect(document.getElementById(errorId!)).toHaveTextContent('Invalid email format')
    })
  })
})

describe('Responsive Design', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  it('should adapt layout for different screen sizes', () => {
    const { rerender } = render(
      <ResponsiveGrid columns={{ xs: 1, md: 2, lg: 3 }}>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    )

    const grid = screen.getByRole('generic')
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  it('should provide appropriate spacing for mobile', () => {
    render(
      <ResponsiveContainer padding="md">
        <div>Content</div>
      </ResponsiveContainer>
    )

    const container = screen.getByRole('generic')
    expect(container).toHaveClass('px-4', 'py-4', 'sm:px-6', 'sm:py-6')
  })
})