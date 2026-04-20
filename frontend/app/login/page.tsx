"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuth, getUserInfo, apiFetch } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setAuth(response.token, response.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || t('loginPage.error'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '10px',
    color: '#EDF2F7',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#00C4FF';
    e.target.style.background = 'rgba(0,196,255,0.04)';
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.10)';
    e.target.style.background = 'rgba(255,255,255,0.04)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07090F',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0,196,255,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
        borderRadius: '50%',
      }} />
      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #00C4FF, #8B5CF6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,196,255,0.25)',
          }}>
            <img src="/icon.png" alt="Dupla" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: '#EDF2F7', fontSize: '22px', fontWeight: '900', letterSpacing: '3px', margin: '0 0 6px' }}>DUPLA</h2>
          <p style={{ color: '#8892A4', fontSize: '14px', margin: 0, fontWeight: '500' }}>{t('loginPage.welcomeBack')}</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#8892A4', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('loginPage.emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#8892A4', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('loginPage.passwordLabel')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: '#00C4FF', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ color: '#8892A4', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>{t('loginPage.rememberMe')}</label>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.5' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #00C4FF 0%, #8B5CF6 100%)',
                color: '#fff',
                fontWeight: '700',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '15px',
                cursor: loading ? 'wait' : 'pointer',
                marginTop: '6px',
                transition: 'opacity 0.2s, transform 0.2s',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 16px rgba(0,196,255,0.25)',
                opacity: loading ? 0.7 : 1,
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}
            >
              {loading ? t('loginPage.signingIn') : t('loginPage.signIn')}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#4A5568', fontSize: '13px', margin: '0 0 6px' }}>{t('loginPage.noAccount')}</p>
          <Link href="/register" style={{ textDecoration: 'none', color: '#00C4FF', fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {t('loginPage.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
