"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT, useLanguage } from "@/lib/i18n";

/* Every plan ships the same product; only the trainee capacity changes. */
const TIER_ORDER = ["starter", "bronze", "silver", "gold"] as const;
const TIER_PRICES: Record<string, number | null> = { starter: null, bronze: 5, silver: 15, gold: 30 };
const TIER_COLORS: Record<string, string> = { starter: '#6B7280', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700' };

interface PricingSectionProps {
  onSelectPlan: (plan: { name: string; color: string }) => void;
}

interface TierCopy {
  name: string;
  sub: string;
  cta: string;
  trainees: string;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const { t } = useT();
  const { language } = useLanguage();

  const title = t('landing.pricing.title');
  const lastSpaceIndex = title.lastIndexOf(' ');
  const titleStart = title.substring(0, lastSpaceIndex + 1);
  const titleEnd = title.substring(lastSpaceIndex + 1);

  const includedCopy = t.landing.pricing.included;
  const includedFeatures = Array.isArray(includedCopy) ? includedCopy : [];

  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {titleStart}
            <span className="gradient-text">{titleEnd}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
          {TIER_ORDER.map((key) => {
            const tier = t(`landing.pricing.tiers.${key}`) as unknown as TierCopy;
            const price = TIER_PRICES[key];
            const isPopular = key === "silver";
            const color = TIER_COLORS[key];

            return (
              <div
                key={key}
                className={cn(
                  "glass-card rounded-2xl p-6 flex flex-col transition-all duration-300 hover:scale-[1.02]",
                  isPopular &&
                    "border-primary/50 shadow-[0_0_40px_rgba(26,117,255,0.2)] relative"
                )}
                style={{ borderTop: `2px solid ${color}` }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground whitespace-nowrap">
                      {t('landing.pricing.mostPopular')}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground min-h-[40px]">
                    {tier.sub}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {price !== null ? `$${price}` : (language === 'es' ? 'Gratis' : 'Free')}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {price !== null ? t('landing.pricing.perMonth') : ` ${t('landing.pricing.foreverFree')}`}
                  </span>
                </div>

                {/* Trainee capacity — the only thing that changes between plans */}
                <div
                  className="mb-6 rounded-xl border px-4 py-3"
                  style={{ borderColor: `${color}33`, backgroundColor: `${color}0f` }}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 flex-shrink-0" style={{ color }} />
                    <span className="text-sm font-semibold text-foreground">{tier.trainees}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('landing.pricing.allIncluded')}
                  </p>
                </div>

                {/* CTA */}
                {key === 'starter' ? (
                  <Link href="/register" className="mt-auto w-full">
                    <Button
                      variant="outline"
                      className="w-full transition-all duration-300 bg-transparent hover:text-white"
                      style={{ 
                        borderColor: color, 
                        color: color 
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${color}15`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => onSelectPlan({ name: tier.name, color })}
                    variant={isPopular ? "default" : "outline"}
                    className={cn(
                      "mt-auto w-full transition-all duration-300",
                      isPopular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_0_20px_rgba(26,117,255,0.4)] border-none"
                        : "bg-transparent hover:text-white"
                    )}
                    style={!isPopular ? { 
                      borderColor: color, 
                      color: color 
                    } : undefined}
                    onMouseEnter={!isPopular ? (e) => {
                      e.currentTarget.style.backgroundColor = `${color}15`;
                    } : undefined}
                    onMouseLeave={!isPopular ? (e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    } : undefined}
                  >
                    {tier.cta}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Shared feature list — identical on every plan */}
        <div className="mt-10 rounded-2xl glass-card p-6 sm:p-8">
          <h3 className="mb-6 text-lg font-semibold text-foreground">
            {t('landing.pricing.includedTitle')}
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {includedFeatures.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
