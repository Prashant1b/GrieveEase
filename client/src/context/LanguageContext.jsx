import { createContext, useContext, useState } from 'react'
import { getTranslation, languages } from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [langCode, setLangCode] = useState(
    localStorage.getItem('grievease_lang') || 'en'
  )

  const changeLanguage = (code) => {
    setLangCode(code)
    localStorage.setItem('grievease_lang', code)
  }

  const tr = getTranslation(langCode)
  const currentLang = languages.find(l => l.code === langCode) || languages[0]

  return (
    <LanguageContext.Provider value={{ langCode, changeLanguage, tr, currentLang, languages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
