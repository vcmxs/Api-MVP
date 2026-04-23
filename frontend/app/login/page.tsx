"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { API_URL, setAuth, getToken, getUserInfo } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Already logged in → go to correct dashboard
  useEffect(() => {
    if (getToken()) {
      const user = getUserInfo()
      if (user?.role === "admin") {
        router.replace("/admin")
      } else {
        router.replace("/dashboard")
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!identifier || !password) { setError("Please fill in all fields."); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }), // Backend uses 'email' field for both email or username
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? "Login failed")
      setAuth(data.token, data.user)
      if (data.user?.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      {/* Background glow */}
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
            <h1 className="text-3xl font-bold text-white">Dupla</h1>
            <p className="mt-1 text-[#888888]">Sign in to continue</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#161b22] p-8" style={{ boxShadow: "0 0 60px rgba(0,255,255,0.04)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/10 px-4 py-3 text-sm text-[#ff4444]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#888888] mb-1.5">Email or Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                autoComplete="username"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/30 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#888888]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#00ffff] hover:text-[#00e5e5] transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 pr-12 text-white placeholder:text-[#555555] focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#00ffff] py-3 font-bold text-black transition-all hover:bg-[#00e5e5] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(0,255,255,0.2)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-[#888888]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-[#00ffff] hover:text-[#00e5e5] transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
