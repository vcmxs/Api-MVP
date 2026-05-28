"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT, useLanguage } from "@/lib/i18n";

const TIER_ORDER = ["starter", "bronze", "silver", "gold", "olympian"] as const;
const TIER_PRICES: Record<string, number | null> = { starter: null, bronze: 15, silver: 30, gold: 50, olympian: 100 };
const TIER_COLORS: Record<string, string> = { starter: '#6B7280', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', olympian: '#8B5CF6' };

interface PricingSectionProps {
  onSelectPlan: (plan: { name: string; color: string }) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const { t } = useT();
  const { language } = useLanguage();

  const title = t('landing.pricing.title');
  const lastSpaceIndex = title.lastIndexOf(' ');
  const titleStart = title.substring(0, lastSpaceIndex + 1);
  const titleEnd = title.substring(lastSpaceIndex + 1);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 xl:gap-6">
          {TIER_ORDER.map((key) => {
            const tier = t(`landing.pricing.tiers.${key}`) as unknown as { name: string; sub: string; cta: string; features: string[] };
            const price = TIER_PRICES[key];
            const isPopular = key === "silver";
            const color = TIER_COLORS[key];
            const features = Array.isArray(tier.features) ? tier.features : [];

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

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {key === 'starter' ? (
                  <Link href="/register" className="w-full">
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
                      "w-full transition-all duration-300",
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
      </div>
    </section>
  );
}
