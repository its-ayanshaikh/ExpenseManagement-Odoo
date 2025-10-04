import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateExpenseDTO, CountryCurrency, ExtractedExpenseData } from '../types'
import { expenseService } from '../services/expenseService'
import { currencyService } from '../services/currencyService'
import { ocrService } from '../services/ocrService'
import { useApi } from '../hooks/useApi'
import { useErrorHandler, useFormErrorHandler } from '../hooks/useErrorHandler'
import { useNotifications } from '../contexts/NotificationContext'
import { AsyncForm } from './shared/AsyncContent'
import { NumberField, SelectField, TextAreaField } from './shared/FormField'

// Validation schema
const expenseSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

interface ExpenseSubmissionFormProps {
  onSuccess: () => void
  onClose: () => void
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Office Supplies',
  'Software',
  'Equipment',
  'Training',
  'Marketing',
  'Other'
]

const ExpenseSubmissionForm: React.FC<ExpenseSubmissionFormProps> = ({ onSuccess, onClose }) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [countries, setCountries] = useState<CountryCurrency[]>([])
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)

  const { showSuccess } = useNotifications()
  const { handleError } = useErrorHandler()
  const { handleSubmissionError } = useFormErrorHandler()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      currency: '',
      category: '',
      description: '',
      expenseDate: new Date().toISOString().split('T')[0], // Today's date
    }
  })

  const watchedValues = watch()

  const {
    loading: submittingExpense,
    error: submitError,
    execute: submitExpense
  } = useApi(expenseService.createExpense.bind(expenseService), {
    onSuccess: () => {
      showSuccess('Expense submitted successfully!')
      onSuccess()
    },
    onError: (error) => {
      handleSubmissionError(error)
    }
  })

  // Load countries and currencies on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await currencyService.getCountriesWithCurrencies()
        setCountries(countriesData)
        
        // Set USD as default currency if available
        const usdCountry = countriesData.find(c => c.currency.code === 'USD')
        if (usdCountry) {
          setValue('currency', usdCountry.currency.code)
        }
      } catch (error) {
        handleError(error, 'Loading countries')
      }
    }

    loadCountries()
  }, [setValue, handleError])

  // Handle file selection and preview
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }

      setReceiptFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle OCR scanning
  const handleOcrScan = async () => {
    if (!receiptFile) return

    setIsOcrProcessing(true)

    try {
      const extractedData: ExtractedExpenseData = await ocrService.scanReceipt(receiptFile)
      
      // Auto-populate form fields with OCR results
      if (extractedData.amount && extractedData.amount > 0) {
        setValue('amount', extractedData.amount)
      }
      
      if (extractedData.currency) {
        setValue('currency', extractedData.currency)
      }
      
      if (extractedData.description) {
        setValue('description', extractedData.description)
      }
      
      if (extractedData.date) {
        // Convert date to YYYY-MM-DD format
        const date = new Date(extractedData.date)
        if (!isNaN(date.getTime())) {
          setValue('expenseDate', date.toISOString().split('T')[0])
        }
      }
      
      if (extractedData.category) {
        // Try to match extracted category with our predefined categories
        const matchedCategory = EXPENSE_CATEGORIES.find(cat => 
          cat.toLowerCase().includes(extractedData.category!.toLowerCase()) ||
          extractedData.category!.toLowerCase().includes(cat.toLowerCase())
        )
        if (matchedCategory) {
          setValue('category', matchedCategory)
        }
      }

      showSuccess('Receipt data extracted successfully!')
    } catch (error) {
      handleError(error, 'OCR processing')
    } finally {
      setIsOcrProcessing(false)
    }
  }

  // Remove receipt file
  const handleRemoveReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    
    // Reset file input
    const fileInput = document.getElementById('receipt') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Handle form submission
  const onSubmit = async (data: ExpenseFormData) => {
    const expenseData: CreateExpenseDTO = {
      ...data,
      receiptFile: receiptFile || undefined
    }

    await submitExpense(expenseData)
  }

  const isLoading = submittingExpense || isSubmitting

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Submit New Expense
          </h3>

          <AsyncForm
            loading={submittingExpense}
            error={submitError}
            onRetry={() => handleSubmit(onSubmit)()}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Receipt Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="receipt" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload Receipt (Optional)
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                  <input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </div>
              </div>

              {receiptPreview && (
                <div className="mt-4">
                  <div className="relative">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="mx-auto max-h-48 rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleOcrScan}
                      disabled={isOcrProcessing}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isOcrProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Scanning...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Scan Receipt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <NumberField
                label="Amount"
                required
                value={watchedValues.amount || ''}
                onChange={(value) => setValue('amount', value as number)}
                error={errors.amount?.message}
                placeholder="0.00"
                min={0}
                step={0.01}
              />

              {/* Currency */}
              <SelectField
                label="Currency"
                required
                value={watchedValues.currency || ''}
                onChange={(value) => setValue('currency', value)}
                error={errors.currency?.message}
                placeholder="Select currency"
                options={countries.map(country => ({
                  value: country.currency.code,
                  label: `${country.currency.code} - ${country.currency.name} (${country.currency.symbol})`
                }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <SelectField
                label="Category"
                required
                value={watchedValues.category || ''}
                onChange={(value) => setValue('category', value)}
                error={errors.category?.message}
                placeholder="Select category"
                options={EXPENSE_CATEGORIES.map(category => ({
                  value: category,
                  label: category
                }))}
              />

              {/* Expense Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={watchedValues.expenseDate || ''}
                  onChange={(e) => setValue('expenseDate', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.expenseDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.expenseDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expenseDate.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <TextAreaField
              label="Description"
              required
              value={watchedValues.description || ''}
              onChange={(value) => setValue('description', value)}
              error={errors.description?.message}
              placeholder="Enter expense description..."
              rows={3}
              maxLength={500}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Expense'}
              </button>
            </div>
          </form>
          </AsyncForm>
        </div>
      </div>
    </div>
  )
}

export default ExpenseSubmissionForm