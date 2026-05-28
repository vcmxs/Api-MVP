"use client";

import { useT } from "@/lib/i18n";
import {
  ClipboardList,
  Activity,
  Apple,
  LineChart,
  MessageCircle,
  Timer,
} from "lucide-react";

const ICONS = [ClipboardList, Activity, Apple, LineChart, MessageCircle, Timer];

export function FeaturesSection() {
  const { t } = useT();
  const features = t('landing.features.items') as unknown as { title: string; desc: string }[];

  const title = t('landing.features.title');
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
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(features) && features.map((feature, index) => {
            const IconComponent = ICONS[index] || ClipboardList;
            return (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(26,117,255,0.1)] group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/20">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
