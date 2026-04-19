"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { API_URL, setAuth, getToken } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"coach" | "trainee">("coach")
  const [showPassword, setShowPassword] = useState(false)
  const [showReferral, setShowReferral] = useState(false)
  const [referralCode, setReferralCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Already logged in → go to dashboard
  useEffect(() => {
    if (getToken()) router.replace("/dashboard")
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role,
          referralCode: referralCode || undefined
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? "Registration failed")
      
      setAuth(data.token, data.user)
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#00ffff] opacity-[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#a78bfa] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ffff]">
            <Dumbbell className="h-7 w-7 text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="mt-1 text-[#888888]">Sign up to get started</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-8" style={{ boxShadow: "0 0 60px rgba(0,255,255,0.04)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-[#888888] mb-2">I am a:</label>
              <div className="flex gap-2 rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-1">
                {(["coach", "trainee"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all"
                    style={{
                      backgroundColor: role === r ? "#00ffff" : "transparent",
                      color: role === r ? "#000" : "#888888",
                    }}
                  >
                    {r === "coach" ? "Coach" : "Trainee"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888888] mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888888] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888888] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 pr-12 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888888] mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Referral code collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowReferral(!showReferral)}
                className="flex items-center gap-1 text-sm text-[#888888] hover:text-white transition-colors"
              >
                {showReferral ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Have a referral code?
              </button>
              {showReferral && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code (optional)"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none font-mono tracking-wider transition-colors"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#00ffff] py-3 font-bold text-black transition-all hover:bg-[#00e5e5] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(0,255,255,0.2)" }}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#888888]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#00ffff] hover:text-[#00e5e5] transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
