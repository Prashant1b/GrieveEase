import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('officerData')
    if (stored) setOfficer(JSON.parse(stored))
  }, [])

  const login = (data) => {
    setOfficer(data.officer)
    localStorage.setItem('officerToken', data.token)
    localStorage.setItem('officerData', JSON.stringify(data.officer))
  }

  const logout = () => {
    setOfficer(null)
    localStorage.removeItem('officerToken')
    localStorage.removeItem('officerData')
  }

  return (
    <AuthContext.Provider value={{ officer, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
