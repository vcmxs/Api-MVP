"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus, Gift, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";

export function ReferralSection() {
  const { t } = useT();

  const title = t('landing.referral.title');
  let titleStart = title;
  let titleHighlight = "";
  let titleEnd = "";
  if (title.includes("Win-Win")) {
    const idx = title.indexOf("Win-Win");
    titleStart = title.substring(0, idx);
    titleHighlight = "Win-Win";
    titleEnd = title.substring(idx + "Win-Win".length);
  }

  const steps = [
    {
      icon: UserPlus,
      title: t('landing.referral.step1Title'),
      description: t('landing.referral.step1Desc'),
    },
    {
      icon: Gift,
      title: t('landing.referral.step2Title'),
      description: t('landing.referral.step2Desc'),
    },
    {
      icon: TrendingUp,
      title: t('landing.referral.step3Title'),
      description: t('landing.referral.step3Desc'),
    },
  ];

  return (
    <section className="py-24 relative">
      {/* Background Accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center">
          {/* Header */}
          <span className="inline-block px-4 py-1 rounded-full text-sm font-semibold bg-primary/20 text-primary mb-6">
            {t('landing.referral.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {titleStart}
            <span className="gradient-text">{titleHighlight}</span>
            {titleEnd}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            {t('landing.referral.subtitle')}
          </p>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-gradient-to-r from-primary/50 to-secondary/50" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(26,117,255,0.3)]">
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href="/register">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-10 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(26,117,255,0.4)]"
            >
              {t('landing.referral.cta').replace(' →', '')}
              <span className="ml-2">→</span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
