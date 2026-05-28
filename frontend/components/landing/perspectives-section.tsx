"use client";

import { useT } from "@/lib/i18n";

export function PerspectivesSection() {
  const { t } = useT();
  const coachSteps = t('landing.how.coachSteps') as unknown as { title: string; desc: string }[];
  const traineeSteps = t('landing.how.traineeSteps') as unknown as { title: string; desc: string }[];

  const title = t('landing.how.title');
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
            {t('landing.how.subtitle')}
          </p>
        </div>

        {/* Two Columns */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Coach Column */}
          <div className="glass-card rounded-2xl p-8 border-primary/30 hover:border-primary/50 transition-all duration-300">
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary uppercase tracking-wider">
                {t('landing.how.coachLabel')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {t('landing.how.coachTitle')}
            </h3>
            <div className="h-4" />

            <div className="space-y-6">
              {Array.isArray(coachSteps) && coachSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Column */}
          <div className="glass-card rounded-2xl p-8 border-secondary/30 hover:border-secondary/50 transition-all duration-300">
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary uppercase tracking-wider">
                {t('landing.how.traineeLabel')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {t('landing.how.traineeTitle')}
            </h3>
            <div className="h-4" />

            <div className="space-y-6">
              {Array.isArray(traineeSteps) && traineeSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-secondary">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
