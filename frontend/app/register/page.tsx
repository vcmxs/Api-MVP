"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { setAuth, API_URL } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '',
    role: 'trainee', sex: '', age: '', phone: '', gym: '', notes: '', referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError(t('registerPage.errorImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('registerPage.errorImageSize'));
      return;
    }
    setProfilePic(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError(t('registerPage.errorPasswordMismatch'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('registerPage.errorPasswordShort'));
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => data.append(k, v));
      if (profilePic) data.append('profilePic', profilePic);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        body: data,
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || t('registerPage.errorGeneric'));
      }

      setAuth(resData.token, resData.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || t('registerPage.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (response: any) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Google sign-in failed');
      setAuth(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [handleGoogleCredential]);

  const triggerGoogleSignIn = () => {
    const g = (window as any).google;
    if (!g) { setError('Google Sign-In not ready, please refresh.'); return; }
    g.accounts.id.cancel();
    g.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError('Google sign-in was blocked by your browser. Please allow pop-ups for this site and try again.');
      }
    });
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#8892A4',
    marginBottom: '6px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#00C4FF';
    e.target.style.background = 'rgba(0,196,255,0.04)';
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.10)';
    e.target.style.background = 'rgba(255,255,255,0.04)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090F',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px 60px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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
        borderRadius: '50%'
      }} />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
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
            boxShadow: '0 8px 24px rgba(0,196,255,0.22)'
          }}>
            <img src="/icon.png" alt="Dupla" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: '#EDF2F7', fontSize: '22px', fontWeight: '900', letterSpacing: '3px', margin: '0 0 6px' }}>DUPLA</h2>
          <p style={{ color: '#8892A4', fontSize: '14px', margin: 0, fontWeight: '500' }}>{t('registerPage.subtitle')}</p>
        </div>

        {/* Role selector — first */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...labelStyle, textAlign: 'center', marginBottom: '10px' }}>{t('registerPage.roleQuestion')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { value: 'trainee', label: t('registerPage.roleTrain'), icon: '🏋️' },
              { value: 'coach', label: t('registerPage.roleCoach'), icon: '📋' }
            ].map(({ value, label, icon }) => (
              <label key={value} style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={formData.role === value}
                  onChange={handleChange}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <div style={{
                  padding: '14px',
                  border: `1px solid ${formData.role === value ? '#00C4FF' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px',
                  background: formData.role === value ? 'rgba(0,196,255,0.07)' : 'rgba(255,255,255,0.03)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: formData.role === value ? '0 0 0 3px rgba(0,196,255,0.10)' : 'none'
                }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: formData.role === value ? '#00C4FF' : '#8892A4' }}>{label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div>
              <label style={labelStyle}>{t('registerPage.photoLabel')} <span style={{ color: '#4A5568', textTransform: 'none', letterSpacing: 0 }}>{t('registerPage.photoOptional')}</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {profilePicPreview
                  ? <img src={profilePicPreview} alt="Preview" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00C4FF', flexShrink: 0 }} />
                  : <div style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                }
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('registerPage.nameLabel')}</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.emailLabel')}</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.usernameLabel')}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555555', fontSize: '15px' }}>@</span>
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} 
                  placeholder={t('registerPage.usernamePlaceholder')} 
                  required 
                  style={{ ...inputStyle, paddingLeft: '32px' }} 
                  onFocus={onFocus} 
                  onBlur={onBlur} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>{t('registerPage.sexLabel')}</label>
                <select name="sex" value={formData.sex} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">{t('registerPage.sexSelect')}</option>
                  <option value="Male">{t('registerPage.sexMale')}</option>
                  <option value="Female">{t('registerPage.sexFemale')}</option>
                  <option value="Other">{t('registerPage.sexOther')}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('registerPage.ageLabel')}</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="25" min="1" max="120" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('registerPage.phoneLabel')}</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+58 412 123 1234" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.gymLabel')}</label>
              <input type="text" name="gym" value={formData.gym} onChange={handleChange} placeholder="Altitude, Bodyfit..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.notesLabel')}</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder={t('registerPage.notesPlaceholder')} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.passwordLabel')} <span style={{ color: '#4A5568', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>{t('registerPage.passwordHint')}</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8892A4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EDF2F7')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8892A4')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.confirmLabel')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8892A4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EDF2F7')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8892A4')}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {formData.role === 'coach' && (
              <div>
                <label style={labelStyle}>{t('registerPage.referralLabel')} <span style={{ color: '#4A5568', textTransform: 'none', letterSpacing: 0 }}>{t('registerPage.referralOptional')}</span></label>
                <input type="text" name="referralCode" value={formData.referralCode} onChange={handleChange} placeholder={t('registerPage.referralPlaceholder')} style={{ ...inputStyle, letterSpacing: '1px' }} onFocus={onFocus} onBlur={onBlur} />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.5' }}>{error}</div>
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
                marginTop: '4px',
                transition: 'opacity 0.2s, transform 0.2s',
                letterSpacing: '0.3px',
                boxShadow: '0 4px 16px rgba(0,196,255,0.22)',
                opacity: loading ? 0.7 : 1,
                fontFamily: "'Inter', -apple-system, sans-serif"
              }}
            >
              {loading ? t('registerPage.submitting') : t('registerPage.submit')}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: '#4A5568', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={triggerGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                color: '#EDF2F7',
                fontSize: '14px',
                fontWeight: '600',
                cursor: googleLoading ? 'wait' : 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
                fontFamily: "'Inter', -apple-system, sans-serif",
                opacity: googleLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#4A5568', fontSize: '13px', margin: '0 0 6px' }}>{t('registerPage.haveAccount')}</p>
          <Link href="/login" style={{ textDecoration: 'none', color: '#00C4FF', fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {t('registerPage.signIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
