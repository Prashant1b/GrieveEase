import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import HeatMap from '../components/HeatMap'
import { Loader2, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function PublicDashboard() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([api.getMapData(), api.getStats()])
      .then(([mapData, statsData]) => {
        setComplaints(mapData)
        setStats(statsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'all') return true
    if (filter === 'overdue') return new Date(c.slaDeadline) < new Date() && !['Resolved','Closed'].includes(c.status)
    if (filter === 'resolved') return ['Resolved','Closed'].includes(c.status)
    return c.status.toLowerCase() === filter.toLowerCase()
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Public Grievance Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Live map of all complaints — no login required</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Resolved</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Resolution Rate</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all','overdue','in progress','resolved'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '480px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <HeatMap complaints={filteredComplaints} />
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Map Legend</h3>
          <div className="space-y-2 text-xs">
            {[
              { color: '#1D9E75', label: 'Resolved / Closed' },
              { color: '#378ADD', label: 'In Progress' },
              { color: '#EF9F27', label: 'Filed / Routed' },
              { color: '#E24B4A', label: 'Overdue (past SLA)' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          {stats?.byDept?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Top Departments</h3>
              {stats.byDept.map(d => (
                <div key={d._id} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-xs">
                  <span className="text-gray-600 truncate">{d._id}</span>
                  <span className="font-medium text-gray-900 ml-2">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
