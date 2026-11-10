"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react"
import { useT } from "@/lib/i18n"
import { getToken } from "@/lib/api"
import { applyInviteCode, fetchInvitePreview, type CoachInvitePreview } from "@/lib/coach-invite"

export default function JoinPage() {
  const { t } = useT()
  const params = useParams<{ code: string | string[] }>()
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code
  const code = (rawCode ?? "").toString().toUpperCase()

  const [preview, setPreview] = useState<CoachInvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applying, setApplying] = useState(false)
  const [linked, setLinked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    setHasSession(Boolean(getToken()))
  }, [])

  useEffect(() => {
    if (!code) {
      setLoading(false)
      setError("This invite link is not valid.")
      return
    }

    let cancelled = false
    setLoading(true)
    setError("")

    fetchInvitePreview(code)
      .then((data) => { if (!cancelled) setPreview(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this invite link.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [code])

  const handleLinkAccount = useCallback(async () => {
    setApplying(true)
    setError("")
    try {
      await applyInviteCode(code)
      setLinked(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("joinPage.errorGeneric"))
    } finally {
      setApplying(false)
    }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "32px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  }

  const primaryButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #00C4FF 0%, #8B5CF6 100%)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    borderRadius: "10px",
    border: "none",
    textDecoration: "none",
    boxShadow: "0 4px 16px rgba(0,196,255,0.22)",
    cursor: "pointer",
    fontFamily: "'Inter', -apple-system, sans-serif",
  }

  const secondaryButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#EDF2F7",
    boxShadow: "none",
  }

  const messageStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#F87171",
    padding: "12px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    lineHeight: "1.5",
    textAlign: "left",
  }

  const coachName = preview?.coachName ?? ""
  const slotsAvailable = preview?.slotsAvailable ?? null
  const isFull = preview?.valid === true && slotsAvailable === 0
  const isUsable = preview?.valid === true

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

      <div style={{ width: "100%", maxWidth: "430px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            {t("joinPage.title")}
          </p>
        </div>

        <div style={cardStyle}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <Loader2 size={26} className="animate-spin" style={{ color: "#00C4FF", margin: "0 auto" }} />
              <p style={{ color: "#8892A4", fontSize: "14px", marginTop: "14px" }}>{t("joinPage.loading")}</p>
            </div>
          ) : linked ? (
            <div style={{ textAlign: "center" }}>
              <CheckCircle2 size={44} style={{ color: "#00ff88", margin: "0 auto 14px" }} />
              <h3 style={{ color: "#EDF2F7", fontSize: "18px", fontWeight: "800", margin: "0 0 8px" }}>
                {t("joinPage.linkedTitle")}
              </h3>
              <p style={{ color: "#8892A4", fontSize: "14px", margin: "0 0 20px", lineHeight: "1.5" }}>
                {t("joinPage.linkedDesc").replace("{coach}", coachName)}
              </p>
              <Link href="/dashboard" style={primaryButtonStyle}>{t("joinPage.goToDashboard")}</Link>
            </div>
          ) : !isUsable ? (
            <div style={{ textAlign: "center" }}>
              <AlertCircle size={40} style={{ color: "#F87171", margin: "0 auto 14px" }} />
              <h3 style={{ color: "#EDF2F7", fontSize: "18px", fontWeight: "800", margin: "0 0 8px" }}>
                {t("joinPage.invalidTitle")}
              </h3>
              <p style={{ color: "#8892A4", fontSize: "14px", margin: "0 0 20px", lineHeight: "1.5" }}>
                {preview?.message ?? (error || t("joinPage.invalidDesc"))}
              </p>
              <Link href="/login" style={secondaryButtonStyle}>{t("joinPage.backToLogin")}</Link>
            </div>
          ) : (
            <div>
              <p style={{ color: "#8892A4", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px", fontWeight: "700" }}>
                {t("joinPage.invitedBy")}
              </p>
              <h3 style={{ color: "#EDF2F7", fontSize: "22px", fontWeight: "900", margin: "0 0 4px" }}>
                {coachName}
              </h3>
              <p style={{ color: "#00C4FF", fontSize: "13px", margin: "0 0 18px", fontWeight: "600" }}>
                {isFull
                  ? t("joinPage.noSlots")
                  : slotsAvailable === null
                    ? t("joinPage.codeLabel").replace("{code}", code)
                    : `${slotsAvailable} ${t("joinPage.spotsAvailable")}`}
              </p>

              {error && (
                <div style={{ ...messageStyle, marginBottom: "14px" }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{error}</span>
                </div>
              )}

              {isFull ? (
                <p style={{ color: "#888888", fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
                  {t("joinPage.noSlotsDesc")}
                </p>
              ) : hasSession ? (
                <button type="button" onClick={handleLinkAccount} disabled={applying} style={{ ...primaryButtonStyle, opacity: applying ? 0.7 : 1 }}>
                  {applying ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {applying ? t("joinPage.linking") : t("joinPage.linkAccount")}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Link href={`/register?coach=${encodeURIComponent(code)}`} style={primaryButtonStyle}>
                    <UserPlus size={16} />
                    {t("joinPage.createAccount")}
                  </Link>
                  <Link href={`/login?coach=${encodeURIComponent(code)}`} style={secondaryButtonStyle}>
                    {t("joinPage.haveAccount")}
                  </Link>
                </div>
              )}

              <p style={{ color: "#4A5568", fontSize: "11px", margin: "16px 0 0", lineHeight: "1.5" }}>
                {t("joinPage.codeLabel").replace("{code}", code)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
