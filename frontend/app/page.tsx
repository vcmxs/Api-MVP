"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PerspectivesSection } from "@/components/landing/perspectives-section";
import { ReferralSection } from "@/components/landing/referral-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";
import { useT } from "@/lib/i18n";
import { X } from "lucide-react";

export default function Home() {
  const { t } = useT();
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; color: string } | null>(null);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PerspectivesSection />
      <ReferralSection />
      <PricingSection onSelectPlan={setSelectedPlan} />
      <Footer />

      {/* Upgrade Contact Modal */}
      {selectedPlan && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPlan(null)}
        >
          <div 
            className="relative w-full max-w-md overflow-hidden rounded-2xl glass-card border border-border p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors"
              onClick={() => setSelectedPlan(null)}
            >
              <X className="h-5 w-5" />
            </button>
            
            <div 
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white mb-4"
              style={{ backgroundColor: selectedPlan.color }}
            >
              {t('landing.modal.title')}
            </div>
            
            <h2 className="text-3xl font-extrabold text-foreground mb-2">
              {selectedPlan.name}
            </h2>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {t('landing.modal.body')}
            </p>
            
            <a 
              href="https://wa.me/584127854824" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#22c35e] text-white py-3.5 rounded-xl font-bold transition-transform duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(37,211,102,0.2)] mb-4"
            >
              💬 {t('landing.modal.whatsapp')}
            </a>
            
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground my-4">
              <span>duplatraining@gmail.com</span>
              <span>+58 412 785 4824</span>
            </div>
            
            <a 
              href={`mailto:duplatraining@gmail.com?subject=Plan ${selectedPlan.name}`} 
              className="flex items-center justify-center w-full bg-muted hover:bg-muted/80 text-foreground py-3.5 rounded-xl font-semibold transition-colors"
            >
              {t('landing.modal.emailBtn')}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
