"use client"

import { useState, useRef } from "react"
import { Dumbbell, Mail } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
  const [pins, setPins] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")
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
    if (pin.length < 6) { setError("Please enter the complete 6-digit PIN."); return }
    setError("")
    setLoading(true)
    // TODO: call POST /auth/verify-email
    setTimeout(() => { setLoading(false) }, 1500)
  }

  const handleResend = () => {
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00ffff] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ffff]">
            <Dumbbell className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">Verify Email</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-8" style={{ boxShadow: "0 0 60px rgba(0,255,255,0.04)" }}>
          {/* Info box */}
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-[#0a0a0f] p-4 text-left">
            <Mail className="h-5 w-5 shrink-0 text-[#00ffff] mt-0.5" />
            <p className="text-sm text-[#888888]">
              We sent a <span className="text-white font-medium">6-digit confirmation PIN</span> to your email. It will expire in 15 minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                {error}
              </div>
            )}

            {/* PIN inputs */}
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
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
                  className="h-14 w-12 rounded-xl border text-center text-xl font-bold text-white transition-all focus:outline-none"
                  style={{
                    backgroundColor: "#0a0a0f",
                    borderColor: pin ? "#00ffff" : "rgba(255,255,255,0.08)",
                    boxShadow: pin ? "0 0 12px rgba(0,255,255,0.15)" : "none",
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || pins.join("").length < 6}
              className="w-full rounded-xl bg-[#00ffff] py-3 font-bold text-black transition-all hover:bg-[#00e5e5] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(0,255,255,0.2)" }}
            >
              {loading ? "Verifying..." : "Verify Account"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-1">
            <span className="text-sm text-[#888888]">Didn&apos;t receive the email?</span>
            <button
              onClick={handleResend}
              className="text-sm font-medium text-[#00ffff] hover:text-[#00e5e5] transition-colors"
            >
              {resent ? "Sent!" : "Resend PIN"}
            </button>
          </div>
        </div>

        <Link href="/login" className="mt-6 inline-block text-sm text-[#888888] hover:text-white transition-colors">
          ← Back to Login
        </Link>
      </div>
    </div>
  )
}
