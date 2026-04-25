"use client"

import { useState, useRef } from "react"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [pins, setPins] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    if (pin.length < 6) { setError("Please enter the complete 6-digit PIN."); return }
    if (!newPassword) { setError("Please enter a new password."); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return }
    setError("")
    setLoading(true)
    // TODO: call POST /auth/reset-password
    setTimeout(() => { setLoading(false); setSuccess(true) }, 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00ffff] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ffff]">
            <img src="/icon.png" alt="Dupla" className="h-8 w-8 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Reset Password</h1>
            <p className="mt-1 text-[#888888]">Enter your PIN and new password</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-8" style={{ boxShadow: "0 0 60px rgba(0,255,255,0.04)" }}>
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full" style={{ backgroundColor: "rgba(0,255,136,0.15)" }}>
                <span className="text-2xl text-[#00ff88]">✓</span>
              </div>
              <p className="font-medium text-white">Password Reset!</p>
              <p className="text-sm text-[#888888]">Your password has been updated successfully.</p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-[#00ffff] py-3 text-center font-bold text-black transition-colors hover:bg-[#00e5e5]"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                  {error}
                </div>
              )}

              {/* PIN inputs */}
              <div>
                <label className="block text-sm font-medium text-[#888888] mb-3 text-center">6-digit PIN from your email</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-[#888888] mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 pr-12 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#888888] mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00ffff] py-3 font-bold text-black transition-all hover:bg-[#00e5e5] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 0 20px rgba(0,255,255,0.2)" }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#888888] hover:text-white transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
