"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function Footer() {
  const { t } = useT();

  const footerLinks = [
    { label: t('landing.footer.privacy'), href: "/privacy" },
    { label: t('landing.footer.terms'), href: "/terms" },
    { label: t('landing.footer.deleteAccount'), href: "/delete-account" },
  ];

  return (
    <footer className="py-12 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="/icon.png" className="h-6 w-6 object-contain" alt="Dupla" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              DUPLA
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            {t('landing.footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
