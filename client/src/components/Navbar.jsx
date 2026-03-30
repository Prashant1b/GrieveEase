import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useCitizenAuth } from '../context/CitizenAuthContext'
import { Shield, FileText, Search, Map, LogOut, Globe, ChevronDown, User } from 'lucide-react'

export default function Navbar() {
  const { officer, logout } = useAuth()
  const { citizen } = useCitizenAuth()
  const { tr, langCode, changeLanguage, languages, currentLang } = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const dropdownRef = useRef(null)
  const isLoggedIn = Boolean(officer || citizen)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">GrievEase</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/file"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/file') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:block">{tr.fileComplaint}</span>
            </Link>

            <Link
              to="/track"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/track') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:block">{tr.track}</span>
            </Link>

            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:block">{tr.publicMap}</span>
            </Link>

            {/* Citizen Login */}
            {citizen && (
              <Link
                to="/my-complaints"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/my-complaints') ? 'bg-green-50 text-green-700' : 'text-green-600 hover:bg-green-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:block">{citizen.name || citizen.email.split('@')[0]}</span>
              </Link>
            )}

            {/* Language Switcher */}
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:block font-medium">{currentLang.nativeLabel}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-50">
                  <p className="text-xs text-gray-400 px-4 py-2 font-medium uppercase tracking-wide">Select Language</p>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { changeLanguage(lang.code); setLangOpen(false) }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        langCode === lang.code ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{lang.nativeLabel}</span>
                      <span className="text-xs text-gray-400">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {officer ? (
              <div className="flex items-center gap-2 ml-1">
                <Link
                  to="/officer/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/officer/dashboard') ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:block">{officer.name}</span>
                </Link>
                {['admin','district_collector'].includes(officer.role) && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin') ? 'bg-red-50 text-red-700' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:block">Admin Panel</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !isLoggedIn ? (
              <Link
                to="/login"
                className="ml-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
