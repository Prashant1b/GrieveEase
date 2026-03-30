import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import {
  Users, FileText, AlertCircle, CheckCircle, Clock,
  TrendingUp, Shield, ChevronDown, ChevronRight,
  Search, Filter, RefreshCw, UserPlus, Edit, Power,
  AlertTriangle, Loader2
} from 'lucide-react'

// Role display config
const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-800 border-red-200' },
  district_collector: { label: 'District Collector', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  senior_officer: { label: 'Senior Officer', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  sub_senior_officer: { label: 'Sub-Senior Officer', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  junior_officer: { label: 'Junior Officer', color: 'bg-green-100 text-green-800 border-green-200' },
  officer: { label: 'Officer', color: 'bg-green-100 text-green-800 border-green-200' },
}

const STATUS_CONFIG = {
  Filed: 'bg-blue-100 text-blue-800',
  Routed: 'bg-purple-100 text-purple-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
  Escalated: 'bg-red-100 text-red-800',
}

const PRIORITY_CONFIG = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'text-gray-900', icon: Icon, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

// ─── Officer Hierarchy Node ───────────────────────────────────────────────────
function OfficerNode({ officer, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2)
  const rc = ROLE_CONFIG[officer.role] || ROLE_CONFIG.officer
  const hasChildren = officer.children?.length > 0

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-100 pl-3' : ''}`}>
      <div className={`flex items-start justify-between p-3 rounded-lg mb-1 hover:bg-gray-50 ${!officer.isActive ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-2 flex-1">
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4 h-4 mt-0.5 block" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{officer.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${rc.color}`}>{rc.label}</span>
              {!officer.isActive && <span className="text-xs text-red-500">(Inactive)</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{officer.department} • {officer.zone || 'No zone'}</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-right ml-2 shrink-0">
          <div className="text-center">
            <p className="font-bold text-gray-800">{officer.stats?.total || 0}</p>
            <p className="text-gray-400">Total</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-green-600">{officer.stats?.resolved || 0}</p>
            <p className="text-gray-400">Resolved</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-red-500">{officer.stats?.overdue || 0}</p>
            <p className="text-gray-400">Overdue</p>
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {officer.children.map(child => (
            <OfficerNode key={child._id} officer={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Add Officer Modal ────────────────────────────────────────────────────────
function AddOfficerModal({ onClose, onSave, officers }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: '',
    zone: '', pinCodes: '', role: 'junior_officer', supervisorId: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password || !form.department) {
      setError('Name, email, password, and department are required.')
      return
    }
    setSaving(true)
    try {
      await api.adminCreateOfficer({
        ...form,
        pinCodes: form.pinCodes.split(',').map(p => p.trim()).filter(Boolean),
        supervisorId: form.supervisorId || null
      })
      onSave()
      onClose()
    } catch (err) {
      setError(err.error || 'Failed to create officer')
    } finally {
      setSaving(false)
    }
  }

  const nonAdminOfficers = officers.filter(o => !['admin'].includes(o.role))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add New Officer</h2>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {[['Name', 'name', 'text', 'Rajesh Kumar'],
            ['Email', 'email', 'email', 'officer@grievease.demo'],
            ['Password', 'password', 'password', ''],
            ['Department', 'department', 'text', 'Municipal Water Board'],
            ['Zone', 'zone', 'text', 'Zone 4'],
            ['PIN Codes (comma-separated)', 'pinCodes', 'text', '411045, 411046'],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="junior_officer">Junior Officer</option>
              <option value="sub_senior_officer">Sub-Senior Officer</option>
              <option value="senior_officer">Senior Officer</option>
              <option value="district_collector">District Collector</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Supervisor (optional)</label>
            <select value={form.supervisorId} onChange={e => setForm(f => ({ ...f, supervisorId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">— No supervisor —</option>
              {nonAdminOfficers.map(o => (
                <option key={o._id} value={o._id}>{o.name} ({ROLE_CONFIG[o.role]?.label || o.role})</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded p-2">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300">
            {saving ? 'Creating...' : 'Create Officer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { officer } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [officers, setOfficers] = useState([])
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalComplaints, setTotalComplaints] = useState(0)
  const [showAddOfficer, setShowAddOfficer] = useState(false)

  // Complaints filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!officer) { navigate('/officer/login'); return }
    if (!['admin', 'district_collector'].includes(officer.role)) {
      navigate('/officer/dashboard')
      return
    }
    loadAll()
  }, [officer])

  useEffect(() => {
    if (tab === 'complaints') loadComplaints()
  }, [tab, search, filterStatus, filterPriority, page])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, o, h] = await Promise.all([
        api.adminGetStats(),
        api.adminGetOfficers(),
        api.adminGetHierarchy()
      ])
      setStats(s)
      setOfficers(o)
      setHierarchy(h)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadComplaints = async () => {
    try {
      const data = await api.adminGetComplaints({ search, status: filterStatus, priority: filterPriority, page })
      setComplaints(data.complaints)
      setTotalComplaints(data.total)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleOfficer = async (id, isActive) => {
    await api.adminUpdateOfficer(id, { isActive: !isActive })
    loadAll()
  }

  const handleReassign = async (complaintId, officerId) => {
    await api.adminUpdateComplaint(complaintId, { officerId })
    loadComplaints()
  }

  if (!officer) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-2xl text-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5" />
              <span className="text-lg font-bold">Admin Control Panel</span>
            </div>
            <p className="text-red-200 text-sm">{officer.name} • {ROLE_CONFIG[officer.role]?.label}</p>
          </div>
          <button onClick={loadAll} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-0">
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'complaints', label: 'All Complaints', icon: FileText },
          { key: 'officers', label: 'Officers', icon: Users },
          { key: 'hierarchy', label: 'Hierarchy', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading && tab === 'overview' ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Complaints" value={stats.total} icon={FileText} iconColor="text-blue-500" />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-600" icon={CheckCircle} iconColor="text-green-500" />
                <StatCard label="Overdue (SLA)" value={stats.overdue} color="text-red-500" icon={AlertCircle} iconColor="text-red-500" />
                <StatCard label="Escalated" value={stats.escalated} color="text-orange-600" icon={AlertTriangle} iconColor="text-orange-500" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="In Progress" value={stats.inProgress} icon={Clock} iconColor="text-yellow-500" />
                <StatCard label="Filed (Pending)" value={stats.filed} icon={FileText} iconColor="text-gray-400" />
                <StatCard label="Systemic Issues" value={stats.systemic} color="text-red-600" icon={AlertTriangle} iconColor="text-red-400" />
                <StatCard label="Active Officers" value={stats.totalOfficers} icon={Users} iconColor="text-blue-500" />
              </div>

              {/* Report download */}
              <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm">Download PDF Report</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Generate a detailed complaint summary report</p>
                </div>
                <a href={api.getReportPDFUrl()} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  📄 Download PDF
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Department */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Complaints by Department</h3>
                  <div className="space-y-2">
                    {stats.byDept?.slice(0, 8).map(d => {
                      const pct = stats.total ? Math.round((d.count / stats.total) * 100) : 0
                      const resPct = d.count ? Math.round((d.resolved / d.count) * 100) : 0
                      return (
                        <div key={d._id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 truncate">{d._id || 'Unassigned'}</span>
                            <span className="font-medium text-gray-900 ml-2">{d.count} <span className="text-green-600">({resPct}% resolved)</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* By Priority */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Complaints by Priority</h3>
                  <div className="space-y-3">
                    {['Critical', 'High', 'Medium', 'Low'].map(p => {
                      const d = stats.byPriority?.find(x => x._id === p)
                      const count = d?.count || 0
                      const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
                      const colors = { Critical: 'bg-red-500', High: 'bg-orange-400', Medium: 'bg-yellow-400', Low: 'bg-green-400' }
                      return (
                        <div key={p}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[p]}`}>{p}</span>
                            <span className="font-medium text-gray-700">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[p]} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPLAINTS TAB ── */}
          {tab === 'complaints' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1) }}
                      placeholder="Search ticket ID, phone, area..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Statuses</option>
                  {['Filed','Routed','In Progress','Resolved','Closed','Escalated'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Priorities</option>
                  {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                </select>
                <button onClick={loadComplaints} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4" /> Load
                </button>
              </div>

              <p className="text-xs text-gray-500">{totalComplaints} complaints found</p>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Ticket ID','Category','Status','Priority','Area / PIN','Assigned To','Filed'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                        ))}
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reassign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {complaints.map(c => (
                        <tr key={c._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-blue-700">{c.ticketId}</span>
                            {c.isSystemic && <span className="ml-1 text-xs text-red-500">⚠</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs">{c.category}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[c.status]}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[c.priority]}`}>{c.priority}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{c.areaName || '—'}<br/>{c.pinCode}</td>
                          <td className="px-4 py-3 text-xs">
                            {c.officerId ? (
                              <div>
                                <p className="font-medium text-gray-800">{c.officerId.name}</p>
                                <p className="text-gray-400">{ROLE_CONFIG[c.officerId.role]?.label || c.officerId.role}</p>
                              </div>
                            ) : <span className="text-gray-400">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              defaultValue={c.officerId?._id || ''}
                              onChange={e => handleReassign(c._id, e.target.value)}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 max-w-32"
                            >
                              <option value="">Unassign</option>
                              {officers.filter(o => o.isActive && !['admin','district_collector'].includes(o.role)).map(o => (
                                <option key={o._id} value={o._id}>{o.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {complaints.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No complaints found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {page} of {Math.ceil(totalComplaints / 20) || 1}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalComplaints / 20)}
                    className="px-3 py-1 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            </div>
          )}

          {/* ── OFFICERS TAB ── */}
          {tab === 'officers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">{officers.length} officers total</p>
                <button onClick={() => setShowAddOfficer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <UserPlus className="w-4 h-4" /> Add Officer
                </button>
              </div>

              <div className="grid gap-3">
                {officers.map(o => {
                  const rc = ROLE_CONFIG[o.role] || ROLE_CONFIG.officer
                  return (
                    <div key={o._id} className={`bg-white rounded-xl border-2 p-4 ${!o.isActive ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-gray-900">{o.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${rc.color}`}>{rc.label}</span>
                            {!o.isActive && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          <p className="text-xs text-gray-500">{o.email}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{o.department} • {o.zone || 'No zone'}</p>
                          {o.supervisorId && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              Reports to: {o.supervisorId.name} ({ROLE_CONFIG[o.supervisorId.role]?.label || o.supervisorId.role})
                            </p>
                          )}
                          {o.pinCodes?.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">PINs: {o.pinCodes.join(', ')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex gap-3 text-xs text-center">
                            <div><p className="font-bold text-gray-800">{o.stats?.total || 0}</p><p className="text-gray-400">Total</p></div>
                            <div><p className="font-bold text-green-600">{o.stats?.resolved || 0}</p><p className="text-gray-400">Done</p></div>
                            <div><p className="font-bold text-red-500">{o.stats?.overdue || 0}</p><p className="text-gray-400">Late</p></div>
                            <div><p className="font-bold text-orange-500">{o.stats?.escalated || 0}</p><p className="text-gray-400">Esc.</p></div>
                          </div>
                          {o.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleOfficer(o._id, o.isActive)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                o.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              {o.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── HIERARCHY TAB ── */}
          {tab === 'hierarchy' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Officer Hierarchy</h3>
              <p className="text-xs text-gray-500 mb-6">Click the arrow to expand/collapse each level</p>
              <div className="space-y-1">
                {hierarchy.map(node => (
                  <OfficerNode key={node._id} officer={node} level={0} />
                ))}
                {hierarchy.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No hierarchy data. Run the seed script first.</p>
                )}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Role Legend</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_CONFIG).filter(([k]) => k !== 'officer').map(([key, val]) => (
                    <span key={key} className={`text-xs px-2 py-1 rounded-full border ${val.color}`}>{val.label}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAddOfficer && (
        <AddOfficerModal
          officers={officers}
          onClose={() => setShowAddOfficer(false)}
          onSave={loadAll}
        />
      )}
    </div>
  )
}
