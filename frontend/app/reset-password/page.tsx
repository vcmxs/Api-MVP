"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useT } from "@/lib/i18n"
import { API_URL } from "@/lib/api"

export default function ResetPasswordPage() {
  const { t } = useT()
  const router = useRouter()
  
  const [pins, setPins] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newPins = [...pins]
    newPins[index] = value.slice(-1)
    setPins(newPins)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pins[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newPins = [...pins]
    text.split("").forEach((char, i) => { if (i < 6) newPins[i] = char })
    setPins(newPins)
    inputs.current[Math.min(text.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pin = pins.join("")
    if (pin.length < 6) { setError(t("resetPasswordPage.errorPinComplete")); return }
    if (!newPassword) { setError(t("resetPasswordPage.errorPasswordRequired")); return }
    if (newPassword !== confirmPassword) { setError(t("resetPasswordPage.errorPasswordMismatch")); return }
    if (newPassword.length < 6) { setError(t("resetPasswordPage.errorPasswordShort")); return }
    
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to reset password")
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
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
        padding: "20px 20px 60px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
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

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
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
              boxShadow: "0 8px 24px rgba(0,196,255,0.22)",
            }}
          >
            <img src="/icon.png" alt="Dupla" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          </div>
          <h2 style={{ color: "#EDF2F7", fontSize: "22px", fontWeight: "900", letterSpacing: "3px", margin: "0 0 6px" }}>
            {t("resetPasswordPage.title")}
          </h2>
          <p style={{ color: "#8892A4", fontSize: "14px", margin: 0, fontWeight: "500" }}>
            {t("resetPasswordPage.subtitle")}
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
          {success ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: "rgba(0,196,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                ✅
              </div>
              <p style={{ fontWeight: "700", color: "#EDF2F7", fontSize: "18px", margin: 0 }}>
                {t("resetPasswordPage.success")}
              </p>
              <p style={{ color: "#8892A4", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
                {t("resetPasswordPage.successDesc")}
              </p>
              <Link
                href="/login"
                style={{
                  background: "linear-gradient(135deg, #00C4FF 0%, #8B5CF6 100%)",
                  color: "#fff",
                  fontWeight: "700",
                  padding: "13px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "15px",
                  marginTop: "8px",
                  boxShadow: "0 4px 16px rgba(0,196,255,0.25)",
                }}
              >
                {t("resetPasswordPage.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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

              <div>
                <label style={{ ...labelStyle, textAlign: "center", marginBottom: "12px" }}>
                  {t("resetPasswordPage.pinLabel")}
                </label>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }} onPaste={handlePaste}>
                  {pins.map((pin, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={pin}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      style={{
                        width: "48px",
                        height: "56px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${pin ? "#00C4FF" : "rgba(255,255,255,0.10)"}`,
                        borderRadius: "12px",
                        color: "#EDF2F7",
                        fontSize: "20px",
                        fontWeight: "700",
                        textAlign: "center",
                        outline: "none",
                        transition: "all 0.2s ease",
                        boxShadow: pin ? "0 0 12px rgba(0,196,255,0.15)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t("resetPasswordPage.newPasswordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder={t("resetPasswordPage.passwordPlaceholder")}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoComplete="new-password"
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

              <div>
                <label style={labelStyle}>{t("resetPasswordPage.confirmPasswordLabel")}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder={t("resetPasswordPage.confirmPlaceholder")}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

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
                {loading ? t("resetPasswordPage.resetting") : t("resetPasswordPage.submit")}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              color: "#8892A4",
              fontWeight: "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EDF2F7")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8892A4")}
          >
            {t("resetPasswordPage.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  )
}
