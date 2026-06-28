import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'zh'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('homeside.lang')
    return stored === 'zh' ? 'zh' : 'en'
  })
  const setLang = (l: Lang) => {
    localStorage.setItem('homeside.lang', l)
    setLangState(l)
  }
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
