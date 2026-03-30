import { CheckCircle, Circle, Clock } from 'lucide-react'

const STEPS = ['Filed', 'Routed', 'In Progress', 'Resolved', 'Closed']

const stepColors = {
  Filed: 'text-blue-600',
  Routed: 'text-purple-600',
  'In Progress': 'text-yellow-600',
  Resolved: 'text-green-600',
  Closed: 'text-green-700',
  Escalated: 'text-red-600',
}

export default function StatusTimeline({ complaint }) {
  const currentStatus = complaint.status
  const isEscalated = currentStatus === 'Escalated'

  const getStepHistory = (step) =>
    complaint.statusHistory?.find(h => h.status === step)

  const getCurrentStepIndex = () => {
    if (isEscalated) return -1
    return STEPS.indexOf(currentStatus)
  }

  const currentIdx = getCurrentStepIndex()

  return (
    <div className="space-y-3">
      {isEscalated && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-800">Complaint Escalated</p>
            <p className="text-xs text-red-600">This complaint has been escalated to a senior officer for priority resolution.</p>
          </div>
        </div>
      )}

      <div className="relative">
        {STEPS.map((step, index) => {
          const history = getStepHistory(step)
          const isPast = index < currentIdx
          const isCurrent = index === currentIdx
          const isFuture = index > currentIdx && !isEscalated

          return (
            <div key={step} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPast ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {isPast ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-1 ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} style={{ minHeight: '20px' }} />
                )}
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isPast ? 'text-green-700' :
                    isCurrent ? 'text-blue-700' :
                    'text-gray-400'
                  }`}>
                    {step}
                  </span>
                  {history && (
                    <span className="text-xs text-gray-400">
                      {new Date(history.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {history?.note && (
                  <p className="text-xs text-gray-500 mt-0.5">{history.note}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
