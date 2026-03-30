import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCitizenAuth } from '../context/CitizenAuthContext'
import { api } from '../lib/api'
import { Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'

export default function CitizenLogin() {
  const { loginCitizen } = useCitizenAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [debugOtp, setDebugOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) { setError('Please enter a valid email.'); return }
    setLoading(true); setError(null)
    try {
      const data = await api.citizenSendOTP(email)
      setDebugOtp(data.debugOtp || '')
      setStep(2)
      if (data.deliveryFailed) {
        setError(data.message || 'OTP generated but email delivery failed.')
      }
    } catch (err) {
      setError(err.error || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('OTP must be 6 digits.'); return }
    setLoading(true); setError(null)
    try {
      const data = await api.citizenVerifyOTP(email, otp)
      loginCitizen(data)
      navigate('/my-complaints')
    } catch (err) {
      setError(err.error || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Mail className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Citizen Login</h1>
        <p className="text-gray-600 text-sm mt-1">Login to track all your complaints</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded p-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="text-center mb-2">
              <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">OTP sent to <strong>{email}</strong></p>
            </div>
            {debugOtp && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                Dev OTP: <strong>{debugOtp}</strong>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
              <input type="text" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={6} required />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded p-2">{error}</p>}
            <button type="submit" disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); setError(null) }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              ← Change email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
