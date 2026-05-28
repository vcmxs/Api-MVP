"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Dumbbell, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

export function HeroSection() {
  const { t } = useT();

  return (
    <section className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card">
              <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-sm text-muted-foreground">
                {t('landing.hero.badge')}
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                {t('landing.hero.title1')}
              </h1>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight gradient-text">
                {t('landing.hero.title2')}
              </h1>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(26,117,255,0.4)] group w-full sm:w-auto"
                >
                  {t('landing.hero.ctaPrimary').replace(' →', '')}
                  <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted rounded-lg px-8 py-6 text-lg font-semibold w-full sm:w-auto"
                >
                  {t('landing.hero.ctaSecondary')}
                </Button>
              </Link>
            </div>

            {/* Social Proof Cards */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="glass-card rounded-xl p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">{t('landing.hero.stat1Value')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('landing.hero.stat1Label')}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <GraduationCap className="h-5 w-5 text-secondary mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">{t('landing.hero.stat2Value')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('landing.hero.stat2Label')}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <Dumbbell className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">{t('landing.hero.stat3Value')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('landing.hero.stat3Label')}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Dashboard Mockup */}
          <div className="relative lg:h-[600px] group">
            {/* Glow behind mockup */}
            <div className="absolute inset-0 glow-blue rounded-3xl" />

            {/* Web Dashboard */}
            <div className="relative glass-card rounded-2xl p-6 animate-float">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-muted-foreground">
                  {t('landing.mockup.coachDashboard')}
                </span>
              </div>

              {/* Dashboard Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('landing.mockup.workoutName')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('landing.mockup.workoutSub')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    {t('landing.mockup.completed')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('landing.mockup.nutritionName')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('landing.mockup.nutritionSub')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {t('landing.mockup.active')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('landing.mockup.cardioName')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('landing.mockup.cardioSub')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {t('landing.mockup.active')}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold text-foreground">12</p>
                    <p className="text-xs text-muted-foreground">{t('landing.mockup.trainees')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold text-foreground">48</p>
                    <p className="text-xs text-muted-foreground">{t('landing.mockup.workouts')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold text-foreground">96%</p>
                    <p className="text-xs text-muted-foreground">{t('landing.mockup.adherence')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Mockup Overlay */}
            <div className="absolute -bottom-8 -left-4 w-48 glass-card rounded-2xl p-4 shadow-2xl animate-float [animation-delay:1s]">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">
                  {t('landing.mockup.traineeView')}
                </span>
              </div>

              {/* Workout Checklist */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-xs text-foreground">
                    Squat: 175kg x 3
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-xs text-foreground">
                    Bench: 100kg x 5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border border-border" />
                  <span className="text-xs text-muted-foreground">
                    Deadlift: 200kg x 3
                  </span>
                </div>
              </div>

              {/* Macro Widget */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full border-2 border-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">72%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-foreground">Macros</p>
                    <p className="text-xs text-muted-foreground">1,580 kcal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
