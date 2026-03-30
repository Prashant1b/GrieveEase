const priorityConfig = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
}

const statusConfig = {
  Filed: 'bg-blue-100 text-blue-800',
  Routed: 'bg-purple-100 text-purple-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
  Escalated: 'bg-red-100 text-red-800',
}

export default function TicketCard({ complaint }) {
  const daysOpen = Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-mono text-sm font-bold text-blue-700">{complaint.ticketId}</span>
          <p className="text-sm text-gray-600 mt-0.5">{complaint.category}</p>
        </div>
        <div className="flex gap-1.5">
          <span className={`text-xs px-2 py-1 rounded-full border ${priorityConfig[complaint.priority]}`}>
            {complaint.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[complaint.status]}`}>
            {complaint.status}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{complaint.aiSummary || complaint.originalText}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{complaint.areaName} • {complaint.pinCode}</span>
        <span>{daysOpen} days ago</span>
      </div>
    </div>
  )
}
