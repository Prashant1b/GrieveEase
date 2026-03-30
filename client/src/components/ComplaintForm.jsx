import { useState, useRef } from 'react'
import { api } from '../lib/api'
import AIPreviewCard from './AIPreviewCard'
import { useLang } from '../context/LanguageContext'
import { useCitizenAuth } from '../context/CitizenAuthContext'
import { Loader2, Copy, Check, ChevronRight, ChevronLeft, Mic, MicOff, Square } from 'lucide-react'

export default function ComplaintForm() {
  const { tr, currentLang } = useLang()
  const { citizen } = useCitizenAuth()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [areaName, setAreaName] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [aiData, setAiData] = useState(null)
  const [locationAutoFilled, setLocationAutoFilled] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [copied, setCopied] = useState(false)

  // Photo upload state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const recognitionRef = useRef(null)

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError(tr.voiceNotSupported)
      return
    }

    setVoiceError(null)
    const recognition = new SpeechRecognition()
    recognition.lang = currentLang.speechCode
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsRecording(true)

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript = transcript
        }
      }
      if (finalTranscript) {
        setText(prev => (prev + ' ' + finalTranscript).trim())
      }
    }

    recognition.onerror = (event) => {
      setIsRecording(false)
      if (event.error !== 'aborted') {
        setVoiceError(`Voice error: ${event.error}. Please try again.`)
      }
    }

    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => { setPhotoFile(null); setPhotoPreview(null) }

  const uploadPhoto = async () => {
    if (!photoFile) return null
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      const BASE = import.meta.env.VITE_API_URL.replace('/api', '')
      const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      return BASE + data.url
    } catch { return null } finally { setUploading(false) }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          setLatitude(String(latitude))
          setLongitude(String(longitude))
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16&addressdetails=1`, { headers: { 'Accept-Language': 'en' } })
          const geo = await resp.json()
          const addr = geo.address || {}
          if (addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.hamlet || addr.residential) {
            setAreaName(addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.hamlet || addr.residential)
          } else if (geo.display_name) {
            setAreaName(String(geo.display_name).split(',')[0].trim())
          }
          if (addr.postcode) setPinCode(addr.postcode)
          if (addr.county || addr.city || addr.state_district || addr.city_district) {
            setDistrict(addr.county || addr.city || addr.state_district || addr.city_district)
          }
          if (addr.state) setState(addr.state)
          setLocationAutoFilled(true)
        } catch (err) { console.error('Geocode error:', err) }
        finally { setGeoLoading(false) }
      },
      () => { setGeoLoading(false); alert('Location access denied.') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleAnalyze = async () => {
    if (text.trim().length < 10) {
      alert('Please describe your problem in more detail.')
      return
    }
    if (isRecording) stopRecording()
    setAnalyzing(true)
    try {
      const result = await api.analyzeComplaint(text)
      setAiData(result)

      // Auto-fill location fields from AI extraction
      if (result.location) {
        const loc = result.location
        let filled = false
        if (loc.areaName && !areaName) { setAreaName(loc.areaName); filled = true }
        if (loc.pinCode && !pinCode)   { setPinCode(loc.pinCode);   filled = true }
        if (loc.district)              { setDistrict(loc.district);  filled = true }
        if (loc.state)                 { setState(loc.state);         filled = true }
        if (filled) setLocationAutoFilled(true)
      }

      setStep(3)
    } catch (err) {
      alert('AI analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      let photoUrl = null
      if (photoFile) photoUrl = await uploadPhoto()

      const result = await api.fileComplaint({
        citizenPhone: phone,
        citizenEmail: citizen?.email || '',
        originalText: text,
        aiSummary: aiData.citizenMessage || aiData.aiSummary,
        languageDetected: aiData.languageDetected,
        category: aiData.category,
        subcategory: aiData.subcategory,
        department: aiData.department,
        priority: aiData.priority,
        pinCode,
        areaName,
        district,
        state,
        latitude,
        longitude,
        photoUrl,
      })
      setTicket(result)
      setStep(4)
    } catch (err) {
      alert('Failed to file complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyTicket = () => {
    navigator.clipboard.writeText(ticket.ticketId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setStep(1); setTicket(null); setText(''); setPinCode('')
    setAreaName(''); setDistrict(''); setState(''); setAiData(null)
    setLatitude(''); setLongitude('')
    setPhone(''); setLocationAutoFilled(false); setPhotoFile(null); setPhotoPreview(null)
  }

  if (step === 4) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr.complaintFiled}</h2>
        <p className="text-gray-600 mb-6">{tr.smsConfirmation}</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 inline-flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-blue-700">{ticket.ticketId}</span>
          <button onClick={copyTicket} className="text-gray-400 hover:text-gray-600 transition-colors">
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-2">Status: <span className="font-medium text-blue-700">{ticket.status}</span></p>
        {ticket.assignedOfficer && (
          <p className="text-sm text-gray-600 mb-2">
            Assigned Officer: <span className="font-medium text-gray-900">{ticket.assignedOfficer.name}</span>
          </p>
        )}
        {ticket.duplicateCount > 0 && (
          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
            📋 {ticket.duplicateCount} similar complaint(s) found in your area. Your complaint has been linked for faster resolution.
          </p>
        )}
        {ticket.isSystemic && (
          <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-2 mb-4">
            {tr.systemicWarning}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <a href={`/track?id=${ticket.ticketId}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            {tr.trackMyComplaint}
          </a>
          <button onClick={resetForm} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            {tr.fileAnother}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1,2,3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step > s ? 'bg-green-500 text-white' :
              step === s ? 'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-400'
            }`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-8 text-xs text-gray-400 mb-6 -mt-2">
        <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>{tr.stepPhone}</span>
        <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>{tr.stepProblem}</span>
        <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>{tr.stepAIPreview}</span>
      </div>

      {/* Step 1: Phone */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tr.mobileNumber}</label>
            <div className="flex">
              <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 flex items-center text-gray-500 text-sm">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{tr.mobileHint}</p>
          </div>
          <button
            onClick={() => phone.length === 10 && setStep(2)}
            disabled={phone.length !== 10}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {tr.continue} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Describe problem + Voice */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tr.describeYourProblem}</label>

            {/* Textarea + Mic button */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={tr.textareaPlaceholder}
                className={`w-full border rounded-xl px-4 py-3 pr-14 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors ${
                  isRecording ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
                rows={5}
              />
              {/* Mic button inside textarea */}
              <button
                onClick={toggleRecording}
                title={isRecording ? tr.recording : tr.startRecording}
                className={`absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Voice status */}
            {isRecording && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {tr.recording}
              </div>
            )}
            {!isRecording && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Mic className="w-3 h-3" /> {tr.voiceHint}
              </p>
            )}
            {voiceError && (
              <p className="text-xs text-red-500 mt-1">{voiceError}</p>
            )}

            <p className="text-xs text-gray-400 mt-1">{text.length} characters</p>
          </div>

          {/* Photo upload (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Evidence <span className="text-xs text-gray-400 font-normal">(optional, max 5MB)</span>
            </label>
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                <button onClick={removePhoto} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-center">
                  <span className="text-gray-400 text-sm">📷 Click to add a photo</span>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              </label>
            )}
          </div>

          {/* Geolocation button */}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 disabled:text-gray-400 transition-colors"
          >
            {geoLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location...</>
            ) : (
              <>📍 Use my current location</>
            )}
          </button>

          {locationAutoFilled && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span>✨</span>
              <span>AI detected location details from your complaint — please verify below</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr.areaName}
                {locationAutoFilled && areaName && <span className="ml-1 text-xs text-green-600">(AI filled)</span>}
              </label>
              <input
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Hadapsar"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 ${
                  locationAutoFilled && areaName ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr.pinCode}
                {locationAutoFilled && pinCode && <span className="ml-1 text-xs text-green-600">(AI filled)</span>}
              </label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="411045"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 ${
                  locationAutoFilled && pinCode ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
                {locationAutoFilled && district && <span className="ml-1 text-xs text-green-600">(AI filled)</span>}
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Pune"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 ${
                  locationAutoFilled && district ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
                {locationAutoFilled && state && <span className="ml-1 text-xs text-green-600">(AI filled)</span>}
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Maharashtra"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 ${
                  locationAutoFilled && state ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> {tr.editBtn}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={text.trim().length < 10 || analyzing}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {tr.analyzing}</>
              ) : (
                tr.analyzeBtn
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Preview */}
      {step === 3 && aiData && (
        <div className="space-y-4">
          <AIPreviewCard data={aiData} onChange={setAiData} />
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> {tr.editBtn}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {tr.submitting}</>
              ) : (
                tr.submitBtn + ' →'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
