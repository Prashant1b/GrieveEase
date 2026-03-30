import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import OfficerTicketCard from '../components/OfficerTicketCard'
import { Loader2, Shield, AlertCircle } from 'lucide-react'

const FILTERS = ['All', 'Routed', 'In Progress', 'Escalated', 'Critical']

export default function OfficerDashboard() {
  const { officer } = useAuth()
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => {
    if (!officer) { navigate('/officer/login'); return }
    loadData()
  }, [officer])

  const loadData = async () => {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getOfficerComplaints(),
        api.getOfficerStats()
      ])
      setComplaints(data.complaints || [])
      setStats(statsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredComplaints = complaints.filter(c => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Critical') return c.priority === 'Critical'
    return c.status === activeFilter
  })

  if (!officer) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl text-white p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5" />
          <h1 className="text-lg font-bold">Hello, {officer.name}</h1>
        </div>
        <p className="text-blue-200 text-sm">{officer.department} • {officer.zone}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Assigned', value: stats.total, color: 'text-gray-900' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-500' },
            { label: 'Systemic', value: stats.systemic, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No complaints found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map(c => (
            <OfficerTicketCard key={c._id} complaint={c} onUpdate={loadData} />
          ))}
        </div>
      )}
    </div>
  )
}
