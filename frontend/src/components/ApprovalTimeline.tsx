import React from 'react'
import { ApprovalHistory, ExpenseStatus } from '../types'

interface ApprovalTimelineProps {
  expenseId: string
  approvalHistory: ApprovalHistory[]
  currentStatus: ExpenseStatus
}

interface TimelineEvent {
  id: string
  type: 'submitted' | 'approved' | 'rejected' | 'pending'
  actor: string
  action: string
  comments?: string
  timestamp: string
  isCurrentStep?: boolean
}

const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ 
  approvalHistory, 
  currentStatus 
}) => {
  // Process approval history into timeline events
  const processTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = []

    // Sort approval history by creation date
    const sortedHistory = [...approvalHistory].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // Add events from approval history
    sortedHistory.forEach((history) => {
      const actorName = history.actor 
        ? `${history.actor.firstName} ${history.actor.lastName}`
        : 'System'

      let eventType: TimelineEvent['type'] = 'approved'
      let actionText = history.action

      // Determine event type based on action
      if (history.action.toLowerCase().includes('submit')) {
        eventType = 'submitted'
        actionText = 'Submitted expense'
      } else if (history.action.toLowerCase().includes('approve')) {
        eventType = 'approved'
        actionText = 'Approved expense'
      } else if (history.action.toLowerCase().includes('reject')) {
        eventType = 'rejected'
        actionText = 'Rejected expense'
      }

      events.push({
        id: history.id,
        type: eventType,
        actor: actorName,
        action: actionText,
        comments: history.comments,
        timestamp: history.createdAt
      })
    })

    // Add pending step if expense is still pending
    if (currentStatus === ExpenseStatus.PENDING && events.length > 0) {
      events.push({
        id: 'pending',
        type: 'pending',
        actor: 'Pending Approver',
        action: 'Awaiting approval',
        timestamp: new Date().toISOString(),
        isCurrentStep: true
      })
    }

    return events
  }

  const timelineEvents = processTimelineEvents()

  // Get icon for event type
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'submitted':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )
      case 'approved':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'pending':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 ring-4 ring-yellow-200">
            <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get text color based on event type
  const getTextColor = (type: TimelineEvent['type'], isCurrentStep?: boolean) => {
    if (isCurrentStep) {
      return 'text-yellow-800'
    }
    
    switch (type) {
      case 'submitted':
        return 'text-blue-800'
      case 'approved':
        return 'text-green-800'
      case 'rejected':
        return 'text-red-800'
      case 'pending':
        return 'text-yellow-800'
      default:
        return 'text-gray-800'
    }
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No approval history</h3>
        <p className="mt-1 text-sm text-gray-500">This expense has no approval history yet.</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {timelineEvents.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== timelineEvents.length - 1 ? (
                <span
                  className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div className="flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${getTextColor(event.type, event.isCurrentStep)}`}>
                        {event.actor}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.action}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <time dateTime={event.timestamp}>
                        {formatTimestamp(event.timestamp)}
                      </time>
                    </div>
                  </div>
                  
                  {/* Comments section */}
                  {event.comments && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border-l-4 border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Comment:</span> {event.comments}
                      </p>
                    </div>
                  )}

                  {/* Current step indicator */}
                  {event.isCurrentStep && (
                    <div className="mt-2 flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      </div>
                      <p className="ml-2 text-sm font-medium text-yellow-800">
                        Current step
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Status summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Current Status</h4>
            <p className="text-sm text-gray-600">
              {currentStatus === ExpenseStatus.PENDING && 'Awaiting approval'}
              {currentStatus === ExpenseStatus.APPROVED && 'Expense has been approved'}
              {currentStatus === ExpenseStatus.REJECTED && 'Expense has been rejected'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentStatus === ExpenseStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
              currentStatus === ExpenseStatus.APPROVED ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApprovalTimeline