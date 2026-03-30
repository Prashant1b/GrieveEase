import { createContext, useContext, useState, useEffect } from 'react'

const CitizenAuthContext = createContext(null)

export function CitizenAuthProvider({ children }) {
  const [citizen, setCitizen] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('citizenData')
    if (stored) setCitizen(JSON.parse(stored))
  }, [])

  const loginCitizen = (data) => {
    setCitizen(data.citizen)
    localStorage.setItem('citizenToken', data.token)
    localStorage.setItem('citizenData', JSON.stringify(data.citizen))
  }

  const logoutCitizen = () => {
    setCitizen(null)
    localStorage.removeItem('citizenToken')
    localStorage.removeItem('citizenData')
  }

  return (
    <CitizenAuthContext.Provider value={{ citizen, loginCitizen, logoutCitizen }}>
      {children}
    </CitizenAuthContext.Provider>
  )
}

export const useCitizenAuth = () => useContext(CitizenAuthContext)
