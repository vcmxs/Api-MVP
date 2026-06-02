"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Check } from "lucide-react"
import { useT, useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const TIER_ORDER = ["starter", "bronze", "silver", "gold", "olympian"] as const
const TIER_PRICES: Record<string, number | null> = { starter: null, bronze: 15, silver: 30, gold: 50, olympian: 100 }
const TIER_COLORS: Record<string, string> = { starter: '#6B7280', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', olympian: '#8B5CF6' }

interface Props {
  currentTier: string | null
  onClose: () => void
}

export function PricingPlansModal({ currentTier, onClose }: Props) {
  const { t } = useT()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const normalizedCurrentTier = currentTier ? currentTier.toLowerCase() : "starter"

  const handleUpgrade = (tierName: string) => {
    const message = encodeURIComponent(
      language === "es"
        ? `¡Hola Dupla! Me gustaría actualizar/cambiar mi plan a ${tierName}.`
        : `Hi Dupla! I'd like to upgrade/change my plan to ${tierName}.`
    )
    window.open(`https://wa.me/584127854824?text=${message}`, "_blank", "noopener,noreferrer")
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="relative flex flex-col w-full max-w-6xl max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-white">
              {t.sidebar?.modalTitle ?? "Subscription Plans"}
            </h3>
            <p className="text-sm text-[#888888] mt-1">
              {t.sidebar?.modalSubtitle ?? "Explore our plans and scale your business."}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#888888] hover:text-white p-1.5 rounded-full hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 xl:gap-6 items-stretch">
            {TIER_ORDER.map((key) => {
              const tier = t(`landing.pricing.tiers.${key}`) as unknown as { name: string; sub: string; cta: string; features: string[] }
              const price = TIER_PRICES[key]
              const isCurrent = normalizedCurrentTier === key
              const color = TIER_COLORS[key]
              const features = Array.isArray(tier.features) ? tier.features : []
              const isPopular = key === "silver"

              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-2xl p-5 flex flex-col transition-all duration-300 relative bg-[#12121a]/60 border border-white/[0.05]",
                    isCurrent && "border-primary/60 bg-primary/[0.03] ring-1 ring-primary/40 shadow-[0_0_25px_rgba(26,117,255,0.15)]",
                    isPopular && !isCurrent && "border-white/[0.12]"
                  )}
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground whitespace-nowrap shadow-md uppercase tracking-wider">
                        {t.sidebar?.currentPlan ?? "Current Plan"}
                      </span>
                    </div>
                  )}

                  {/* Popular Badge */}
                  {isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#1a75ff]/20 text-[#1a75ff] border border-[#1a75ff]/30 whitespace-nowrap uppercase tracking-wider">
                        {t('landing.pricing.mostPopular')}
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-white mb-1">
                      {tier.name}
                    </h4>
                    <p className="text-xs text-[#888888] min-h-[32px] leading-relaxed">
                      {tier.sub}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <span className="text-3xl font-extrabold text-white">
                      {price !== null ? `$${price}` : (language === 'es' ? 'Gratis' : 'Free')}
                    </span>
                    <span className="text-[#666666] text-xs font-semibold ml-1">
                      {price !== null ? t('landing.pricing.perMonth') : ` ${t('landing.pricing.foreverFree')}`}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-xs text-[#b3b3b3] leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-[#1c1c24] border border-white/[0.04] text-[#666666] py-2.5 rounded-xl text-xs font-bold uppercase cursor-default"
                    >
                      {t.sidebar?.currentPlan ?? "Current Plan"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(tier.name)}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-1.5",
                        isPopular
                          ? "bg-primary hover:bg-primary/95 text-primary-foreground hover:shadow-[0_0_15px_rgba(26,117,255,0.35)]"
                          : "bg-transparent text-white border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.2]"
                      )}
                      style={!isPopular ? { borderColor: color, color: color } : undefined}
                    >
                      <span>💬</span>
                      <span>{tier.cta}</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
