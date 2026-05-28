"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X } from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useT();
  const { language, setLanguage } = useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="/icon.png" className="h-8 w-8 object-contain" alt="Dupla" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              DUPLA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <span className="text-sm">
                    {language === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border"
              >
                <DropdownMenuItem 
                  onClick={() => setLanguage("en")}
                  className="text-foreground hover:bg-muted cursor-pointer"
                >
                  🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage("es")}
                  className="text-foreground hover:bg-muted cursor-pointer"
                >
                  🇪🇸 Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth Buttons */}
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {t('landing.nav.signIn')}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 transition-all duration-300 hover:scale-105">
                {t('landing.hero.ctaPrimary')}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                  >
                    <span>{language === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-border w-full">
                  <DropdownMenuItem 
                    onClick={() => setLanguage("en")}
                    className="text-foreground hover:bg-muted cursor-pointer"
                  >
                    🇺🇸 English
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLanguage("es")}
                    className="text-foreground hover:bg-muted cursor-pointer"
                  >
                    🇪🇸 Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/login" className="w-full">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                >
                  {t('landing.nav.signIn')}
                </Button>
              </Link>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                  {t('landing.hero.ctaPrimary')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
