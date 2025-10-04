import React, { useState } from 'react'
import { ExpenseStatus } from '../../types'
import {
  CurrencySelector,
  ExpenseStatusBadge,
  ReceiptUploader,
  LoadingSpinner,
  ErrorMessage,
  ConfirmDialog,
  DeleteConfirmDialog,
} from './index'

/**
 * Demo component to showcase all shared UI components
 * This file demonstrates how to use each component and can be used for testing
 */
export const SharedComponentsDemo: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
    console.log('File selected:', file.name)
  }

  const handleFileRemove = () => {
    setUploadedFile(null)
    console.log('File removed')
  }

  const handleOCRScan = (file: File) => {
    console.log('OCR scan requested for:', file.name)
    // Simulate OCR processing
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      console.log('OCR scan completed')
    }, 2000)
  }

  const handleConfirm = () => {
    console.log('Action confirmed')
    setShowConfirmDialog(false)
    setShowDeleteDialog(false)
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Shared Components Demo</h1>
      
      {/* Currency Selector */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Currency Selector</h2>
        <div className="max-w-md">
          <CurrencySelector
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            placeholder="Select a currency"
            showFlag={true}
          />
          {selectedCurrency && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedCurrency}
            </p>
          )}
        </div>
      </section>

      {/* Expense Status Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Expense Status Badges</h2>
        <div className="flex flex-wrap gap-4">
          <ExpenseStatusBadge status={ExpenseStatus.PENDING} size="sm" />
          <ExpenseStatusBadge status={ExpenseStatus.APPROVED} size="md" />
          <ExpenseStatusBadge status={ExpenseStatus.REJECTED} size="lg" />
        </div>
      </section>

      {/* Receipt Uploader */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Receipt Uploader</h2>
        <div className="max-w-md">
          <ReceiptUploader
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            currentFile={uploadedFile}
            showPreview={true}
            onOCRScan={handleOCRScan}
            isOCRLoading={isLoading}
          />
        </div>
      </section>

      {/* Loading Spinners */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Loading Spinners</h2>
        <div className="flex flex-wrap gap-8 items-center">
          <LoadingSpinner size="sm" text="Small" />
          <LoadingSpinner size="md" text="Medium" />
          <LoadingSpinner size="lg" text="Large" />
          <LoadingSpinner size="xl" text="Extra Large" />
        </div>
      </section>

      {/* Error Messages */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Error Messages</h2>
        <div className="space-y-4">
          <ErrorMessage
            type="error"
            title="Error"
            message="Something went wrong. Please try again."
            onRetry={() => console.log('Retry clicked')}
          />
          <ErrorMessage
            type="warning"
            title="Warning"
            message="This action cannot be undone."
          />
          <ErrorMessage
            type="info"
            title="Information"
            message="Your changes have been saved successfully."
            onDismiss={() => console.log('Dismissed')}
          />
        </div>
      </section>

      {/* Confirm Dialogs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Confirm Dialogs</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Show Confirm Dialog
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Show Delete Dialog
          </button>
        </div>
      </section>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
        type="info"
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirm}
        itemName="Test Item"
        itemType="expense"
      />
    </div>
  )
}

export default SharedComponentsDemo