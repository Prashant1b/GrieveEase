import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { FileText, Search, Zap } from 'lucide-react'

export default function Home() {
  const { tr } = useLang()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6 border border-white/20">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>Powered by GrievEase AI</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
              {tr.heroTitle.split(',')[0]},<br />
              <span className="text-yellow-300">{tr.heroTitle.split(',').slice(1).join(',').trim()}</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">{tr.heroSubtitle}</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/file" className="px-8 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg">
                {tr.fileBtn}
              </Link>
              <Link to="/track" className="px-8 py-3.5 bg-blue-500/30 text-white border border-white/40 rounded-xl font-bold text-lg hover:bg-blue-500/50 transition-colors">
                {tr.trackBtn}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 divide-x divide-gray-200">
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{tr.totalComplaints}</p>
              </div>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-green-600">{stats.resolved.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{tr.resolved}</p>
              </div>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-red-500">{stats.overdue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{tr.overdue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{tr.howItWorks}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tr.feature1Title}</h3>
            <p className="text-gray-600 text-sm">{tr.feature1Desc}</p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tr.feature2Title}</h3>
            <p className="text-gray-600 text-sm">{tr.feature2Desc}</p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tr.feature3Title}</h3>
            <p className="text-gray-600 text-sm">{tr.feature3Desc}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

