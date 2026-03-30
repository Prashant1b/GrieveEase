import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'

const priorityConfig = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
}

export default function OfficerTicketCard({ complaint, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(complaint.status)
  const [notes, setNotes] = useState(complaint.officerNotes || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const daysOpen = Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))
  const isOverdue = complaint.slaDeadline && new Date(complaint.slaDeadline) < new Date() && !['Resolved','Closed'].includes(status)

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.updateComplaintStatus(complaint._id, { status, officerNotes: notes })
      setSaved(true)
      onUpdate?.()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${isOverdue ? 'border-red-300' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-blue-700">{complaint.ticketId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityConfig[complaint.priority]}`}>
              {complaint.priority}
            </span>
            {complaint.isSystemic && (
              <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle className="w-3 h-3" />
                Systemic Issue
              </span>
            )}
            {isOverdue && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                OVERDUE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{complaint.category} — {complaint.areaName}, {complaint.pinCode}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className="text-xs text-gray-500">{daysOpen}d</span>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">AI Summary</p>
            <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-2">{complaint.aiSummary}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Original Complaint</p>
            <p className="text-sm text-gray-600 italic">{complaint.originalText}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Update Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Filed">Filed</option>
                <option value="Routed">Routed</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Escalated">Escalated</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  saved ? 'bg-green-500 text-white' :
                  'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300'
                }`}
              >
                {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Update'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Officer Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about action taken..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
