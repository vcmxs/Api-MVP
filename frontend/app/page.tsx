"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Dumbbell, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Shield, 
  ArrowRight, 
  Check, 
  ChevronDown,
  Menu,
  X,
  Star
} from "lucide-react"
import { getToken } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (getToken()) router.replace("/dashboard")
  }, [router])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const pricingTiers = [
    {
      name: "Starter",
      price: "0",
      description: "Perfect for starting your coaching journey.",
      features: ["Up to 3 Trainees", "Basic Workout Builder", "Basic Progress Tracking", "Email Support"],
      cta: "Get Started",
      color: "gray"
    },
    {
      name: "Bronze",
      price: "15",
      description: "Enhanced tools for growing coaches.",
      features: ["Up to 10 Trainees", "Advanced Workout Plans", "Nutrition Tracking", "Direct Messaging"],
      cta: "Go Bronze",
      color: "amber"
    },
    {
      name: "Silver",
      price: "30",
      description: "Our most popular plan for professionals.",
      popular: true,
      features: ["Up to 25 Trainees", "Full Custom Branding", "Revenue Insights", "Blast Messaging"],
      cta: "Most Popular",
      color: "cyan"
    },
    {
      name: "Gold",
      price: "50",
      description: "Scale your business with elite tools.",
      features: ["Unlimited Trainees", "Team Management", "Premium Analytics", "Priority Support"],
      cta: "Go Gold",
      color: "yellow"
    },
    {
      name: "Olympian",
      price: "100",
      description: "The ultimate platform for fitness empires.",
      features: ["Custom App Options", "API Access", "Dedicated Success Manager", "Enterprise Security"],
      cta: "Become Olympian",
      color: "purple"
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-[#00ffff]/30">
      {/* Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#00ffff] opacity-[0.03] blur-[120px]" />
        <div className="absolute -right-[10%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-[#a78bfa] opacity-[0.03] blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 px-6 lg:px-12",
        scrolled ? "h-16 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/[0.05]" : "h-24"
      )}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00ffff] shadow-[0_0_20px_rgba(0,255,255,0.3)] group-hover:scale-105 transition-transform">
              <Dumbbell className="h-6 w-6 text-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Dupla</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-[#888888] hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-[#888888] hover:text-white transition-colors">Pricing</Link>
            <div className="h-4 w-px bg-white/10" />
            <Link href="/login" className="text-sm font-medium text-[#888888] hover:text-white transition-colors">Sign In</Link>
            <Link 
              href="/register" 
              className="rounded-xl bg-[#00ffff] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:bg-[#00e5e5] hover:scale-105 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-2">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0a0f] pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-center">
            <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Features</Link>
            <Link href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Pricing</Link>
            <div className="h-px w-full bg-white/10 my-4" />
            <Link href="/login" className="text-xl text-[#888888]">Sign In</Link>
            <Link href="/register" className="rounded-2xl bg-[#00ffff] py-4 text-xl font-bold text-black">Get Started</Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 lg:pt-52 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00ffff]/20 bg-[#00ffff]/5 px-4 py-1.5 mb-8 animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-[#00ffff] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#00ffff]">Premium Coaching Platform</span>
            </div>
            
            <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl mb-8 leading-[1.1]">
              Elevate Your <br />
              <span className="text-[#00ffff] drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">Fitness Empire</span>
            </h1>

            <p className="max-w-2xl text-lg text-[#888888] mb-12 leading-relaxed sm:text-xl">
              The all-in-one workspace for modern fitness coaches. Manage trainees, 
              design elite programs, and scale your business with data-driven insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link 
                href="/register" 
                className="group flex items-center justify-center gap-2 rounded-2xl bg-[#00ffff] px-8 py-4 text-lg font-bold text-black shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:bg-[#00e5e5] hover:scale-105 transition-all active:scale-95 w-full sm:w-auto"
              >
                Start for Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#features" 
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                Learn More
              </Link>
            </div>

            {/* Dashboard Preview */}
            <div className="relative mt-24 w-full max-w-5xl group">
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-[#00ffff]/50 to-[#a78bfa]/50 opacity-20 blur-2xl transition duration-1000 group-hover:opacity-40" />
              <div className="relative rounded-3xl border border-white/[0.08] bg-[#161b22] p-2 shadow-2xl overflow-hidden">
                <div className="flex h-8 items-center gap-1.5 px-4 bg-white/[0.03]">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="aspect-[16/9] bg-[#0a0a0f] overflow-hidden relative">
                   {/* Simplified Dashboard Visual Placeholder */}
                   <div className="absolute inset-0 p-8 flex flex-col gap-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="h-6 w-32 rounded bg-white/5" />
                        <div className="flex gap-2">
                           <div className="h-8 w-8 rounded-full bg-white/10" />
                           <div className="h-8 w-24 rounded-lg bg-white/10" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="h-32 rounded-2xl bg-[#00ffff]/5 border border-[#00ffff]/10" />
                        <div className="h-32 rounded-2xl bg-white/5" />
                        <div className="h-32 rounded-2xl bg-white/5" />
                      </div>
                      <div className="flex-1 rounded-2xl bg-white/5" />
                   </div>
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-[#00ffff]/10 p-4 border border-[#00ffff]/20 backdrop-blur-sm">
                        <TrendingUp className="h-12 w-12 text-[#00ffff]" />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-[#00ffff] font-bold uppercase tracking-widest text-sm mb-4">Core Ecosystem</h2>
            <h3 className="text-4xl font-black sm:text-5xl">Engineered for Results</h3>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { 
                icon: <Dumbbell />, 
                title: "Workout Architect", 
                desc: "Build complex periodized plans with a library of 1,000+ exercises and custom templates." 
              },
              { 
                icon: <TrendingUp />, 
                title: "Deep Analytics", 
                desc: "Track volume, intensity, and progression curves for every trainee automatically." 
              },
              { 
                icon: <MessageSquare />, 
                title: "Direct Connect", 
                desc: "Crystal-clear communication with in-app messaging and blast announcements." 
              },
              { 
                icon: <Users />, 
                title: "Trainee Hub", 
                desc: "Centralized profiles for every client with shared goals, nutrition, and history." 
              },
              { 
                icon: <Shield />, 
                title: "Revenue Engine", 
                desc: "Integrated subscription management and financial insights for your coaching business." 
              },
              { 
                icon: <Star />, 
                title: "Branding", 
                desc: "A professional platform that makes your coaching look as premium as your results." 
              }
            ].map((f, i) => (
              <div key={i} className="group rounded-3xl border border-white/[0.08] bg-[#161b22] p-8 hover:bg-[#1c2128] transition-all hover:-translate-y-1">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00ffff]/10 text-[#00ffff] group-hover:bg-[#00ffff] group-hover:text-black transition-colors">
                  {f.icon}
                </div>
                <h4 className="text-xl font-bold mb-3">{f.title}</h4>
                <p className="text-[#888888] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-[#a78bfa] font-bold uppercase tracking-widest text-sm mb-4">Scalable Plans</h2>
            <h3 className="text-4xl font-black sm:text-5xl">Built to grow with you</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i} 
                className={cn(
                  "relative flex flex-col rounded-3xl border p-8 transition-all hover:scale-[1.02]",
                  tier.popular 
                    ? "border-[#00ffff]/50 bg-[#161b22] shadow-[0_0_40px_rgba(0,255,255,0.1)] z-10" 
                    : "border-white/[0.08] bg-[#161b22]/50 hover:bg-[#161b22]"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#00ffff] px-4 py-1 text-xs font-black text-black">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-8">
                  <h4 className="text-lg font-bold mb-2">{tier.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">${tier.price}</span>
                    <span className="text-sm text-[#888888]">/mo</span>
                  </div>
                </div>
                <p className="text-sm text-[#888888] mb-8 leading-relaxed">{tier.description}</p>
                <div className="flex-1 space-y-4 mb-8">
                  {tier.features.map((feat, j) => (
                    <div key={j} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00ffff]" />
                      <span className="text-[#dddddd]">{feat}</span>
                    </div>
                  ))}
                </div>
                <Link 
                  href="/register" 
                  className={cn(
                    "rounded-2xl py-3 text-center text-sm font-bold transition-all",
                    tier.popular 
                      ? "bg-[#00ffff] text-black shadow-[0_0_20px_rgba(0,255,255,0.2)]" 
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl rounded-[3rem] bg-gradient-to-br from-[#00ffff] to-[#a78bfa] p-[1px]">
          <div className="rounded-[3rem] bg-[#0a0a0f] px-8 py-20 text-center lg:px-16">
            <h2 className="text-4xl font-black sm:text-6xl mb-8 leading-tight">
              Ready to transform your <br /> coaching business?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#888888] mb-12 sm:text-xl">
              Join hundreds of elite coaches already using Dupla to manage their business 
              and deliver life-changing results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register" 
                className="rounded-2xl bg-white px-10 py-5 text-xl font-black text-black shadow-2xl hover:scale-105 transition-all"
              >
                Join Dupla Today
              </Link>
              <Link 
                href="https://wa.me/584127854824" 
                className="rounded-2xl border border-white/20 bg-white/5 px-10 py-5 text-xl font-bold hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffff]">
                <Dumbbell className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-bold">Dupla</span>
            </Link>
            <div className="flex gap-8 text-sm text-[#555555]">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
            </div>
          </div>
          <div className="text-center text-sm text-[#333333]">
            © {new Date().getFullYear()} Dupla Fitness Platforms. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
