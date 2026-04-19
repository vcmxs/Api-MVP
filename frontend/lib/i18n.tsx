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

export function useLanguage() {
  const { lang, setLang } = useContext(I18nContext)
  return { language: lang, setLanguage: setLang }
}

export function useT() {
  const { t: dictionary } = useContext(I18nContext)

  const translate = (path: string, defaultValue?: string) => {
    const keys = path.split('.')
    let result: any = dictionary

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        return defaultValue || path
      }
    }

    return result
  }

  // Combine the function and the dictionary for backward compatibility
  const t = Object.assign(translate, dictionary)

  return { t }
}
