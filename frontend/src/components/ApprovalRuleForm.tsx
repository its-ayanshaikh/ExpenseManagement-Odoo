import React, { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { approvalRuleService } from '../services/approvalRuleService'
import { userService } from '../services/userService'
import { ApprovalRule, ApprovalRuleType, UserRole } from '../types'
import { useNotifications } from '../contexts/NotificationContext'

// Validation schema
const approvalRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  ruleType: z.nativeEnum(ApprovalRuleType, { required_error: 'Rule type is required' }),
  percentageThreshold: z.number().min(1).max(100).optional(),
  specificApproverId: z.string().optional(),
  isHybrid: z.boolean().default(false),
  priority: z.number().min(1, 'Priority must be at least 1'),
  approvers: z.array(z.object({
    approverId: z.string().min(1, 'Approver is required'),
    sequence: z.number().min(1, 'Sequence must be at least 1')
  })).optional()
})

type ApprovalRuleFormData = z.infer<typeof approvalRuleSchema>

interface ApprovalRuleFormProps {
  rule?: ApprovalRule | null
  onClose: () => void
  onSuccess: () => void
}

const ApprovalRuleForm: React.FC<ApprovalRuleFormProps> = ({ rule, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotifications()
  
  // Fetch users for approver selection
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers()
  })

  // Filter users to only show Admins and Managers
  const eligibleApprovers = users.filter(user => 
    user.role === UserRole.ADMIN || user.role === UserRole.MANAGER
  )

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
    reset
  } = useForm<ApprovalRuleFormData>({
    resolver: zodResolver(approvalRuleSchema),
    defaultValues: {
      name: '',
      ruleType: ApprovalRuleType.SEQUENTIAL,
      percentageThreshold: 50,
      specificApproverId: '',
      isHybrid: false,
      priority: 1,
      approvers: [{ approverId: '', sequence: 1 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'approvers'
  })

  const watchedRuleType = watch('ruleType')
  const watchedIsHybrid = watch('isHybrid')

  // Set form values when editing
  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name,
        ruleType: rule.ruleType,
        percentageThreshold: rule.percentageThreshold || 50,
        specificApproverId: rule.specificApproverId || '',
        isHybrid: rule.isHybrid,
        priority: rule.priority,
        approvers: rule.approvers.length > 0 
          ? rule.approvers.map(a => ({ approverId: a.approverId, sequence: a.sequence }))
          : [{ approverId: '', sequence: 1 }]
      })
    }
  }, [rule, reset])

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: ApprovalRuleFormData) => {
      const payload = {
        name: data.name,
        ruleType: data.ruleType,
        percentageThreshold: data.percentageThreshold,
        specificApproverId: data.specificApproverId,
        isHybrid: data.isHybrid,
        priority: data.priority,
        approverIds: data.approvers?.map(a => a.approverId) || []
      }

      if (rule) {
        return approvalRuleService.updateApprovalRule(rule.id, payload)
      } else {
        return approvalRuleService.createApprovalRule(payload)
      }
    },
    onSuccess: () => {
      showSuccess(
        rule ? 'Approval rule updated successfully!' : 'Approval rule created successfully!',
        'Approval Rules'
      )
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Failed to save approval rule:', error)
      showError('Failed to save approval rule. Please check your inputs and try again.', 'Approval Rules')
    }
  })

  const onSubmit = (data: ApprovalRuleFormData) => {
    // Validate rule-specific requirements
    if (data.ruleType === ApprovalRuleType.PERCENTAGE || (data.isHybrid && data.ruleType === ApprovalRuleType.HYBRID)) {
      if (!data.percentageThreshold || data.percentageThreshold < 1 || data.percentageThreshold > 100) {
        showError('Percentage threshold must be between 1 and 100 for percentage-based rules', 'Validation Error')
        return
      }
    }

    if (data.ruleType === ApprovalRuleType.SPECIFIC_APPROVER || (data.isHybrid && data.ruleType === ApprovalRuleType.HYBRID)) {
      if (!data.specificApproverId) {
        showError('Specific approver is required for specific approver rules', 'Validation Error')
        return
      }
    }

    if (data.ruleType === ApprovalRuleType.SEQUENTIAL) {
      if (!data.approvers || data.approvers.length === 0) {
        showError('At least one approver is required for sequential rules', 'Validation Error')
        return
      }

      // Check for duplicate sequences
      const sequences = data.approvers.map(a => a.sequence)
      const uniqueSequences = new Set(sequences)
      if (sequences.length !== uniqueSequences.size) {
        showError('Approver sequences must be unique', 'Validation Error')
        return
      }

      // Check for empty approver IDs
      const hasEmptyApprovers = data.approvers.some(a => !a.approverId)
      if (hasEmptyApprovers) {
        showError('All approvers must be selected', 'Validation Error')
        return
      }
    }

    mutation.mutate(data)
  }

  const addApprover = () => {
    const nextSequence = Math.max(...fields.map(f => f.sequence), 0) + 1
    append({ approverId: '', sequence: nextSequence })
  }

  const removeApprover = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const shouldShowPercentage = watchedRuleType === ApprovalRuleType.PERCENTAGE || 
    (watchedIsHybrid && watchedRuleType === ApprovalRuleType.HYBRID)

  const shouldShowSpecificApprover = watchedRuleType === ApprovalRuleType.SPECIFIC_APPROVER || 
    (watchedIsHybrid && watchedRuleType === ApprovalRuleType.HYBRID)

  const shouldShowSequentialApprovers = watchedRuleType === ApprovalRuleType.SEQUENTIAL

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {rule ? 'Edit Approval Rule' : 'Create Approval Rule'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Rule Name *
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Standard Approval Process"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <input
                type="number"
                id="priority"
                min="1"
                {...register('priority', { valueAsNumber: true })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Lower numbers have higher priority</p>
            </div>
          </div>

          {/* Rule Type */}
          <div>
            <label htmlFor="ruleType" className="block text-sm font-medium text-gray-700">
              Rule Type *
            </label>
            <select
              id="ruleType"
              {...register('ruleType')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value={ApprovalRuleType.SEQUENTIAL}>Sequential - Approvers in specific order</option>
              <option value={ApprovalRuleType.PERCENTAGE}>Percentage - Require % of approvers</option>
              <option value={ApprovalRuleType.SPECIFIC_APPROVER}>Specific Approver - One person can auto-approve</option>
              <option value={ApprovalRuleType.HYBRID}>Hybrid - Percentage OR specific approver</option>
            </select>
            {errors.ruleType && (
              <p className="mt-1 text-sm text-red-600">{errors.ruleType.message}</p>
            )}
          </div>

          {/* Hybrid Option */}
          {watchedRuleType === ApprovalRuleType.HYBRID && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isHybrid"
                {...register('isHybrid')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isHybrid" className="ml-2 block text-sm text-gray-900">
                Enable hybrid rule (percentage OR specific approver)
              </label>
            </div>
          )}

          {/* Percentage Threshold */}
          {shouldShowPercentage && (
            <div>
              <label htmlFor="percentageThreshold" className="block text-sm font-medium text-gray-700">
                Percentage Threshold *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="percentageThreshold"
                  min="1"
                  max="100"
                  {...register('percentageThreshold', { valueAsNumber: true })}
                  className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              {errors.percentageThreshold && (
                <p className="mt-1 text-sm text-red-600">{errors.percentageThreshold.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Percentage of approvers required to approve</p>
            </div>
          )}

          {/* Specific Approver */}
          {shouldShowSpecificApprover && (
            <div>
              <label htmlFor="specificApproverId" className="block text-sm font-medium text-gray-700">
                Specific Approver *
              </label>
              <select
                id="specificApproverId"
                {...register('specificApproverId')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={usersLoading}
              >
                <option value="">Select an approver</option>
                {eligibleApprovers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
              {errors.specificApproverId && (
                <p className="mt-1 text-sm text-red-600">{errors.specificApproverId.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">This person can approve expenses automatically</p>
            </div>
          )}

          {/* Sequential Approvers */}
          {shouldShowSequentialApprovers && (
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Approval Sequence *
                </label>
                <button
                  type="button"
                  onClick={addApprover}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Approver
                </button>
              </div>
              <div className="mt-2 space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <select
                        {...register(`approvers.${index}.approverId`)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={usersLoading}
                      >
                        <option value="">Select approver</option>
                        {eligibleApprovers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="hidden"
                      {...register(`approvers.${index}.sequence`, { valueAsNumber: true })}
                      value={index + 1}
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeApprover(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Expenses will be routed to approvers in this order
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApprovalRuleForm