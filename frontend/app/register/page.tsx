"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { setToken, setUserInfo, API_URL } from '@/lib/api';

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'trainee', sex: '', age: '', phone: '', gym: '', notes: '', referralCode: ''
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      setToken(resData.token);
      setUserInfo(resData.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || t('registerPage.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '10px',
    color: '#EDF2F7',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#8892A4',
    marginBottom: '5px',
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
        top: '20%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0,196,255,0.06) 0%, transparent 65%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #00C4FF, #8B5CF6)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,196,255,0.22)'
          }}>
            <img src="/icon.png" alt="Dupla" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: '#EDF2F7', fontSize: '20px', fontWeight: '900', letterSpacing: '3px', margin: '0 0 4px' }}>DUPLA</h2>
          <p style={{ color: '#8892A4', fontSize: '13px', margin: 0, fontWeight: '500' }}>{t('registerPage.subtitle')}</p>
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
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>{t('registerPage.confirmLabel')}</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
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
