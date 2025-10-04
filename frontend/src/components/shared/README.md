# Shared UI Components

This directory contains reusable UI components that are used throughout the Expense Management System frontend.

## Components

### CurrencySelector
A dropdown component for selecting currencies with country flags.

**Props:**
- `value: string` - Selected currency code
- `onChange: (currency: string) => void` - Callback when currency changes
- `disabled?: boolean` - Whether the selector is disabled
- `className?: string` - Additional CSS classes
- `placeholder?: string` - Placeholder text
- `showFlag?: boolean` - Whether to show country flags

**Usage:**
```tsx
<CurrencySelector
  value={selectedCurrency}
  onChange={setSelectedCurrency}
  placeholder="Select currency"
  showFlag={true}
/>
```

### ExpenseStatusBadge
A badge component for displaying expense status with color coding.

**Props:**
- `status: ExpenseStatus` - The expense status (PENDING, APPROVED, REJECTED)
- `className?: string` - Additional CSS classes
- `size?: 'sm' | 'md' | 'lg'` - Badge size

**Usage:**
```tsx
<ExpenseStatusBadge status={ExpenseStatus.PENDING} size="md" />
```

### ReceiptUploader
A drag-and-drop file uploader component with OCR scanning capability.

**Props:**
- `onFileSelect: (file: File) => void` - Callback when file is selected
- `onFileRemove?: () => void` - Callback when file is removed
- `currentFile?: File | null` - Currently selected file
- `currentImageUrl?: string` - URL of current image
- `disabled?: boolean` - Whether the uploader is disabled
- `className?: string` - Additional CSS classes
- `maxSize?: number` - Maximum file size in bytes
- `acceptedTypes?: string[]` - Accepted file types
- `showPreview?: boolean` - Whether to show image preview
- `onOCRScan?: (file: File) => void` - Callback for OCR scanning
- `isOCRLoading?: boolean` - Whether OCR is processing

**Usage:**
```tsx
<ReceiptUploader
  onFileSelect={handleFileSelect}
  onFileRemove={handleFileRemove}
  currentFile={uploadedFile}
  showPreview={true}
  onOCRScan={handleOCRScan}
  isOCRLoading={isOCRLoading}
/>
```

### LoadingSpinner
A customizable loading spinner component.

**Props:**
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Spinner size
- `color?: 'blue' | 'gray' | 'white' | 'green' | 'red'` - Spinner color
- `className?: string` - Additional CSS classes
- `text?: string` - Loading text
- `fullScreen?: boolean` - Whether to show as full screen overlay

**Usage:**
```tsx
<LoadingSpinner size="md" text="Loading..." />
```

**Additional Components:**
- `InlineSpinner` - Small spinner for buttons
- `LoadingOverlay` - Overlay spinner for components

### ErrorMessage
A component for displaying error, warning, and info messages.

**Props:**
- `message: string` - Error message text
- `title?: string` - Error title
- `type?: 'error' | 'warning' | 'info'` - Message type
- `className?: string` - Additional CSS classes
- `onDismiss?: () => void` - Callback for dismiss action
- `onRetry?: () => void` - Callback for retry action
- `showIcon?: boolean` - Whether to show icon
- `fullWidth?: boolean` - Whether to take full width

**Usage:**
```tsx
<ErrorMessage
  type="error"
  title="Error"
  message="Something went wrong"
  onRetry={handleRetry}
/>
```

**Additional Components:**
- `InlineError` - Small error message for forms
- `ErrorFallback` - Error boundary fallback
- `NetworkError` - Network-specific error
- `NotFoundError` - 404-style error

### ConfirmDialog
A modal dialog for confirming actions.

**Props:**
- `isOpen: boolean` - Whether dialog is open
- `onClose: () => void` - Callback to close dialog
- `onConfirm: () => void` - Callback to confirm action
- `title: string` - Dialog title
- `message: string` - Dialog message
- `confirmText?: string` - Confirm button text
- `cancelText?: string` - Cancel button text
- `type?: 'danger' | 'warning' | 'info'` - Dialog type
- `isLoading?: boolean` - Whether action is loading
- `disabled?: boolean` - Whether confirm is disabled

**Usage:**
```tsx
<ConfirmDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleConfirm}
  title="Confirm Action"
  message="Are you sure?"
  type="danger"
/>
```

**Additional Components:**
- `DeleteConfirmDialog` - Specialized delete confirmation
- `LogoutConfirmDialog` - Specialized logout confirmation
- `ApprovalConfirmDialog` - Specialized approval confirmation

## Requirements Fulfilled

This implementation fulfills the following requirements:

### Requirement 3.1 (Expense Submission)
- `CurrencySelector` enables currency selection for expense submission
- `ReceiptUploader` allows receipt upload with drag-and-drop functionality

### Requirement 3.5 (Expense Status Display)
- `ExpenseStatusBadge` provides visual status indicators for expenses

### Requirement 8.1 (OCR Receipt Scanning)
- `ReceiptUploader` includes OCR scanning functionality with loading states

## Design Patterns

All components follow these design patterns:
- **Consistent Props Interface**: All components accept `className` for styling flexibility
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Loading States**: Components handle loading states appropriately
- **Error Handling**: Components gracefully handle error states
- **TypeScript**: Full TypeScript support with proper type definitions
- **Tailwind CSS**: Consistent styling using Tailwind utility classes

## Testing

A demo component is available at `./demo.tsx` that showcases all shared components and can be used for manual testing and development.

## Usage in Application

Import components from the shared index:

```tsx
import {
  CurrencySelector,
  ExpenseStatusBadge,
  ReceiptUploader,
  LoadingSpinner,
  ErrorMessage,
  ConfirmDialog
} from '../components/shared'
```

Or from the main components index:

```tsx
import {
  CurrencySelector,
  ExpenseStatusBadge,
  // ... other components
} from '../components'
```