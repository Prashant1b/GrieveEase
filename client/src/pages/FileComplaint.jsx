import ComplaintForm from '../components/ComplaintForm'
import { useLang } from '../context/LanguageContext'
import { Shield } from 'lucide-react'

export default function FileComplaint() {
  const { tr } = useLang()

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{tr.fileGrievance}</h1>
        <p className="text-gray-600 text-sm mt-1">{tr.fileGrievanceSubtitle}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <ComplaintForm />
      </div>
    </div>
  )
}
