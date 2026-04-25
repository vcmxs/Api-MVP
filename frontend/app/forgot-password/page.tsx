"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError("Please enter your email address."); return }
    setError("")
    setLoading(true)
    // TODO: call POST /auth/forgot-password
    setTimeout(() => { setLoading(false); setSent(true) }, 1500)
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
            <h1 className="text-3xl font-bold text-white">Forgot Password?</h1>
            <p className="mt-1 text-[#888888]">We&apos;ll send you a reset PIN</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-8" style={{ boxShadow: "0 0 60px rgba(0,255,255,0.04)" }}>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full" style={{ backgroundColor: "rgba(0,255,136,0.15)" }}>
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-medium text-white">PIN Sent!</p>
              <p className="text-sm text-[#888888]">
                Check your email for the 6-digit reset PIN. It expires in 15 minutes.
              </p>
              <Link
                href="/reset-password"
                className="block w-full rounded-xl bg-[#00ffff] py-3 text-center font-bold text-black transition-colors hover:bg-[#00e5e5]"
              >
                Enter Reset PIN
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                  {error}
                </div>
              )}

              <p className="text-sm text-[#888888]">
                Enter your email address and we&apos;ll send you a 6-digit PIN to reset your password.
              </p>

              <div>
                <label className="block text-sm font-medium text-[#888888] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00ffff] py-3 font-bold text-black transition-all hover:bg-[#00e5e5] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 0 20px rgba(0,255,255,0.2)" }}
              >
                {loading ? "Sending..." : "Send Reset PIN"}
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
