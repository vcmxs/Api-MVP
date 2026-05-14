"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useT } from "@/lib/i18n"
import { setAuth, getToken, getUserInfo, API_URL } from "@/lib/api"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export default function LoginPage() {
  const { t } = useT()
  const router = useRouter()
  
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
    const savedIdentifier = localStorage.getItem("rememberedIdentifier") || localStorage.getItem("rememberedEmail")
    if (savedIdentifier) {
      setIdentifier(savedIdentifier)
      setRememberMe(true)
    }
  }, [])

  // Already logged in → go to correct dashboard
  useEffect(() => {
    if (!isMounted) return
    if (getToken()) {
      const user = getUserInfo()
      if (user?.role?.toLowerCase() === "admin") {
        router.replace("/admin")
      } else {
        router.replace("/dashboard")
      }
    }
  }, [isMounted, router])

  const handleGoogleCredential = useCallback(async (response: any) => {
    setGoogleLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? "Google sign-in failed")
      setAuth(data.token, data.user)
      if (data.user?.role?.toLowerCase() === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setGoogleLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      ;(window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
      if (googleBtnRef.current) {
        ;(window as any).google?.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: googleBtnRef.current.offsetWidth || 336,
        })
      }
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [handleGoogleCredential])

  const triggerGoogleSignIn = () => {
    ;(window as any).google?.accounts.id.prompt()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!identifier || !password) {
      setError(t("login.fillFields"))
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? t("loginPage.error"))
      
      if (rememberMe) {
        localStorage.setItem("rememberedIdentifier", identifier)
      } else {
        localStorage.removeItem("rememberedIdentifier")
        localStorage.removeItem("rememberedEmail")
      }

      setAuth(data.token, data.user)
      if (data.user?.role?.toLowerCase() === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("loginPage.error"))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "10px",
    color: "#EDF2F7",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s ease, background 0.2s ease",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#00C4FF"
    e.currentTarget.style.background = "rgba(0,196,255,0.04)"
  }

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"
    e.currentTarget.style.background = "rgba(255,255,255,0.04)"
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#8892A4",
    marginBottom: "6px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07090F",
        padding: "20px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(0,196,255,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              background: "linear-gradient(135deg, #00C4FF, #8B5CF6)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,196,255,0.25)",
            }}
          >
            <img src="/icon.png" alt="Dupla" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          </div>
          <h2 style={{ color: "#EDF2F7", fontSize: "22px", fontWeight: "900", letterSpacing: "3px", margin: "0 0 6px" }}>
            DUPLA
          </h2>
          <p style={{ color: "#8892A4", fontSize: "14px", margin: 0, fontWeight: "500" }}>
            {t("loginPage.welcomeBack")}
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>{t("loginPage.emailLabel")}</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder={t("loginPage.emailLabel")}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
                autoComplete="username"
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{t("loginPage.passwordLabel")}</label>
                <Link 
                  href="/forgot-password" 
                  style={{ fontSize: "12px", color: "#00C4FF", textDecoration: "none" }}
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: "44px" }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#8892A4",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EDF2F7")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8892A4")}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#00C4FF", width: "15px", height: "15px", cursor: "pointer" }}
              />
              <label
                htmlFor="rememberMe"
                style={{ color: "#8892A4", fontSize: "13px", cursor: "pointer", userSelect: "none" }}
              >
                {t("loginPage.rememberMe")}
              </label>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#F87171",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #00C4FF 0%, #8B5CF6 100%)",
                color: "#fff",
                fontWeight: "700",
                padding: "13px",
                borderRadius: "10px",
                border: "none",
                fontSize: "15px",
                cursor: loading ? "wait" : "pointer",
                marginTop: "6px",
                transition: "opacity 0.2s, transform 0.2s",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 16px rgba(0,196,255,0.25)",
                opacity: loading ? 0.7 : 1,
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}
            >
              {loading ? t("loginPage.signingIn") : t("loginPage.signIn")}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0 0" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "#4A5568", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Google rendered button */}
          <div
            ref={googleBtnRef}
            style={{ marginTop: "14px", width: "100%", display: "flex", justifyContent: "center" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ color: "#4A5568", fontSize: "13px", margin: "0 0 6px" }}>{t("loginPage.noAccount")}</p>
          <Link
            href="/register"
            style={{
              textDecoration: "none",
              color: "#00C4FF",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {t("loginPage.createAccount")}
          </Link>
        </div>
      </div>
    </div>
  )
}
