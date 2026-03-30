import { Link } from 'react-router-dom'
import { Shield, User, ArrowRight } from 'lucide-react'

export default function LoginChoice() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Choose Login Type</h1>
        <p className="text-gray-600 mt-2">Continue as a citizen or an officer.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/citizen/login"
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Citizen Login</h2>
          <p className="text-sm text-gray-600 mb-4">Use your email and OTP to view your complaints.</p>
          <span className="inline-flex items-center gap-2 text-green-700 font-medium text-sm">
            Continue <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          to="/officer/login"
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Officer Login</h2>
          <p className="text-sm text-gray-600 mb-4">Login with email, password, and OTP sent to your email.</p>
          <span className="inline-flex items-center gap-2 text-blue-700 font-medium text-sm">
            Continue <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    </div>
  )
}
