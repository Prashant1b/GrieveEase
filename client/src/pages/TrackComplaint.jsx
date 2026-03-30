import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import StatusTimeline from '../components/StatusTimeline'
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TrackComplaint() {
  const { tr } = useLang()
  const [searchParams] = useSearchParams()
  const [ticketId, setTicketId] = useState(searchParams.get('id') || '')
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supporting, setSupporting] = useState(false)
  const [supportDone, setSupportDone] = useState(false)

  const handleSearch = async () => {
    if (!ticketId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.trackComplaint(ticketId.trim().toUpperCase())
      setComplaint(data)
    } catch (err) {
      setError(tr.ticketNotFound)
      setComplaint(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('id')) handleSearch()
  }, [])

  const handleConfirm = async (resolved) => {
    setConfirming(true)
    try {
      await api.confirmResolution(complaint._id, resolved)
      await handleSearch()
    } catch (err) {
      alert('Failed to update. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const handleRate = async () => {
    if (rating === 0) return
    setRatingSubmitting(true)
    try {
      await api.rateComplaint(complaint._id, rating, ratingComment)
      setRatingDone(true)
      await handleSearch()
    } catch (err) { alert('Failed to submit rating') }
    finally { setRatingSubmitting(false) }
  }

  const handleSupport = async () => {
    if (!supportEmail.includes('@')) { alert('Please enter a valid email'); return }
    setSupporting(true)
    try {
      await api.supportComplaint(complaint.ticketId, { email: supportEmail })
      setSupportDone(true)
      await handleSearch()
    } catch (err) { alert(err.error || 'Failed to support') }
    finally { setSupporting(false) }
  }

  const priorityConfig = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{tr.trackYourComplaint}</h1>
        <p className="text-gray-600 text-sm mt-1">{tr.trackSubtitle}</p>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={tr.ticketPlaceholder}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {complaint && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-mono text-lg font-bold text-blue-700">{complaint.ticketId}</span>
                <p className="text-gray-500 text-sm mt-0.5">{complaint.category} — {complaint.department}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityConfig[complaint.priority]}`}>
                {complaint.priority}
              </span>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-green-700 mb-1">{tr.aiSummary}</p>
              <p className="text-sm text-green-900">{complaint.aiSummary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-gray-500 text-xs">{tr.area}</span>
                <p className="font-medium">{complaint.areaName}, {complaint.pinCode}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{tr.filedOn}</span>
                <p className="font-medium">{new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              {complaint.officerId && (
                <div>
                  <span className="text-gray-500 text-xs">{tr.assignedOfficer}</span>
                  <p className="font-medium">{complaint.officerId.name}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500 text-xs">{tr.slaDeadline}</span>
                <p className={`font-medium ${new Date(complaint.slaDeadline) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                  {new Date(complaint.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">{tr.statusTimeline}</h3>
              <StatusTimeline complaint={complaint} />
            </div>

            {complaint.status === 'Resolved' && !complaint.citizenConfirmed && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-800 mb-3">{tr.resolvedQuestion}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirm(true)}
                    disabled={confirming}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {tr.yesFixed}
                  </button>
                  <button
                    onClick={() => handleConfirm(false)}
                    disabled={confirming}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:bg-gray-300 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {tr.noStillBroken}
                  </button>
                </div>
              </div>
            )}

            {/* Rating section */}
            {['Resolved', 'Closed'].includes(complaint.status) && !complaint.rating && !ratingDone && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm font-medium text-yellow-800 mb-3">⭐ Rate your experience</p>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ★
                    </button>
                  ))}
                  {rating > 0 && <span className="text-sm text-yellow-700 ml-2 self-center">{rating}/5</span>}
                </div>
                <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                  placeholder="Optional feedback about the resolution..."
                  className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm resize-none mb-3" rows={2} />
                <button onClick={handleRate} disabled={rating === 0 || ratingSubmitting}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:bg-gray-300 transition-colors">
                  {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            )}

            {/* Show existing rating */}
            {complaint.rating && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-yellow-800">Citizen Rating:</span>
                  <span className="text-yellow-400 text-lg">{'★'.repeat(complaint.rating)}{'☆'.repeat(5 - complaint.rating)}</span>
                  <span className="text-sm text-yellow-700">{complaint.rating}/5</span>
                </div>
                {complaint.ratingComment && (
                  <p className="text-xs text-yellow-700 mt-1 italic">"{complaint.ratingComment}"</p>
                )}
              </div>
            )}

            {/* Related tickets */}
            {complaint.relatedTickets?.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">📋 Related Complaints in Area</p>
                <div className="flex gap-2 flex-wrap">
                  {complaint.relatedTickets.map(t => (
                    <a key={t} href={`/track?id=${t}`} className="text-xs bg-white text-blue-700 px-2 py-1 rounded-full border border-blue-200 hover:bg-blue-100">{t}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Support / Petition */}
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-800">🤝 Support this complaint</p>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                  {complaint.supporterCount || 0} supporters
                </span>
              </div>
              <p className="text-xs text-purple-600 mb-3">Show the government this issue matters. Add your support to make it a public petition.</p>
              {supportDone ? (
                <p className="text-sm text-green-600 font-medium">✓ Your support has been added!</p>
              ) : (
                <div className="flex gap-2">
                  <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)}
                    placeholder="Your email to support"
                    className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" />
                  <button onClick={handleSupport} disabled={supporting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 transition-colors whitespace-nowrap">
                    {supporting ? '...' : 'Support'}
                  </button>
                </div>
              )}
            </div>

            {/* Photo evidence */}
            {complaint.photoUrl && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">📷 Photo Evidence</p>
                <img src={complaint.photoUrl} alt="Evidence" className="w-full max-w-xs rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
