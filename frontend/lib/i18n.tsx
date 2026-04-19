"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import en from "@/locales/en"
import es from "@/locales/es"
import type { TranslationKeys } from "@/locales/en"

type Lang = "en" | "es"

const dictionaries: Record<Lang, TranslationKeys> = { en, es }

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslationKeys
}

const I18nContext = createContext<I18nContextValue>({
  lang: "es",
  setLang: () => {},
  t: es,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es")

  useEffect(() => {
    const stored = localStorage.getItem("dupla_lang") as Lang | null
    if (stored === "en" || stored === "es") setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem("dupla_lang", l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT() {
  return useContext(I18nContext)
}
