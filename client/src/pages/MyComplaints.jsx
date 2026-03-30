import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCitizenAuth } from '../context/CitizenAuthContext'
import { useLang } from '../context/LanguageContext'
import { api } from '../lib/api'
import TicketCard from '../components/TicketCard'
import { Loader2, FileText, Plus, User, LogOut, Mail, Trophy, Star, Award } from 'lucide-react'

export default function MyComplaints() {
  const { tr } = useLang()
  const { citizen, logoutCitizen } = useCitizenAuth()
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [rewardStats, setRewardStats] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!citizen) { navigate('/citizen/login'); return }
    loadData()
  }, [citizen])

  const loadData = async () => {
    try {
      const [complaintsData, leaderboardData, rewardData] = await Promise.all([
        api.getCitizenComplaints(citizen.phone || citizen.email),
        api.getRewardsLeaderboard().catch(() => []),
        api.getCitizenRewards(citizen.email).catch(() => null)
      ])
      setComplaints(complaintsData)
      setLeaderboard(leaderboardData || [])
      setRewardStats(rewardData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!citizen) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl text-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{citizen.name || 'Citizen'}</h1>
              <div className="flex items-center gap-2 text-green-100 text-sm">
                <Mail className="w-3 h-3" />
                <span>{citizen.email}</span>
              </div>
            </div>
          </div>
          <button onClick={() => { logoutCitizen(); navigate('/') }}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {rewardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-yellow-200 p-4">
            <div className="flex items-center gap-2 mb-1 text-yellow-600">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium">Reward Points</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rewardStats.rewardPoints}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-1 text-green-600">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">Genuine Complaints</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rewardStats.genuineComplaints}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-1 text-blue-600">
              <Award className="w-4 h-4" />
              <span className="text-xs font-medium">Tier</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rewardStats.rewardTier}</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-1 text-purple-600">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">Leaderboard Rank</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">#{rewardStats.rank}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">My Complaints ({complaints.length})</h2>
            <Link to="/file"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {tr.fileComplaint}
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-green-500 animate-spin" /></div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No complaints filed yet.</p>
              <Link to="/file" className="text-blue-600 text-sm hover:underline mt-2 inline-block">{tr.fileBtn}</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map(c => (
                <Link key={c._id} to={`/track?id=${c.ticketId}`}>
                  <TicketCard complaint={c} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Citizen Leaderboard</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Rankings are based on genuine complaints that were resolved and confirmed.</p>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400">No leaderboard entries yet.</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map(entry => (
                <div key={entry.email} className={`rounded-lg border p-3 ${entry.email === citizen.email ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">#{entry.rank} {entry.displayName}</p>
                    <span className="text-xs font-medium text-yellow-700">{entry.rewardPoints} pts</span>
                  </div>
                  <p className="text-xs text-gray-500">{entry.genuineComplaints} genuine • {entry.resolvedComplaints} resolved • {entry.rewardTier}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
