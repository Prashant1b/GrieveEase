import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { CitizenAuthProvider } from './context/CitizenAuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import FileComplaint from './pages/FileComplaint'
import TrackComplaint from './pages/TrackComplaint'
import PublicDashboard from './pages/PublicDashboard'
import OfficerLogin from './pages/OfficerLogin'
import OfficerDashboard from './pages/OfficerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CitizenLogin from './pages/CitizenLogin'
import MyComplaints from './pages/MyComplaints'
import LoginChoice from './pages/LoginChoice'

export default function App() {
  return (
    <LanguageProvider>
    <CitizenAuthProvider>
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginChoice />} />
            <Route path="/file" element={<FileComplaint />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/dashboard" element={<PublicDashboard />} />
            <Route path="/officer/login" element={<OfficerLogin />} />
            <Route path="/officer/dashboard" element={<OfficerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/citizen/login" element={<CitizenLogin />} />
            <Route path="/my-complaints" element={<MyComplaints />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
    </CitizenAuthProvider>
    </LanguageProvider>
  )
}
