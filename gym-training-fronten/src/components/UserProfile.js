import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import '../App.css';
import { API_URL, BASE_URL } from '../config/api';
import { useTheme } from '../context/ThemeContext';

function UserProfile({ userId, editable, onUpdate }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        weight: '',
        height: '',
        sex: '',
        phone: '',
        gym: '',
        notes: ''
    });
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(360);
    const [referralCodeInput, setReferralCodeInput] = useState('');

    const [applyingReferral, setApplyingReferral] = useState(false);

    // THEME CONFIGURATION
    const { currentTheme, toggleTheme, styles } = useTheme();

    useEffect(() => {
        loadProfile();
        loadExchangeRate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadExchangeRate = async () => {
        try {
            const response = await axios.get(`${API_URL}/currency/rate`);
            if (response.data && response.data.rate) {
                setExchangeRate(response.data.rate);
            }
        } catch (e) {
            console.log('Error loading exchange rate', e);
        }
    };

    const loadProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/${userId}/profile`);
            setProfile(response.data);
            setFormData({
                name: response.data.name || '',
                age: response.data.age || '',
                weight: response.data.weight || '',
                height: response.data.height || '',
                sex: response.data.sex || '',
                phone: response.data.phone || '',
                gym: response.data.gym || '',
                notes: response.data.notes || ''
            });
            setProfilePicUrl(response.data.profile_pic_url || '');
        } catch (err) {
            console.error('Load profile error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/users/${userId}/profile`, formData);
            alert('¡Perfil actualizado exitosamente!');
            setEditing(false);
            loadProfile();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Update profile error:', err);
            alert('Error al actualizar el perfil: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Solo se permiten imágenes (JPEG, PNG, WEBP)');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen debe ser menor a 5MB');
                return;
            }

            setProfilePicFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfilePicUpload = async () => {
        if (!profilePicFile) {
            alert('Por favor selecciona una imagen primero');
            return;
        }

        setUploadingPic(true);

        try {
            const formData = new FormData();
            formData.append('profilePic', profilePicFile);

            await axios.put(`${API_URL}/users/${userId}/profile-picture`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('¡Foto de perfil actualizada!');
            setProfilePicFile(null);
            setProfilePicPreview(null);
            loadProfile();
        } catch (err) {
            console.error('Update profile picture error:', err);
            alert('Error al actualizar la foto de perfil');
        } finally {
            setUploadingPic(false);
        }
    };

    const handleApplyReferralCode = async () => {
        if (!referralCodeInput.trim()) return;
        setApplyingReferral(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/referrals/apply`,
                { referralCode: referralCodeInput },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('¡Código aplicado exitosamente! Disfruta tu 20% de descuento.');
            setReferralCodeInput('');
            loadProfile(); // Refresh to update view
        } catch (err) {
            console.error('Apply referral error:', err);
            alert(err.response?.data?.error || 'Error al aplicar el código');
        } finally {
            setApplyingReferral(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('¿Estás SEGURO que quieres eliminar tu cuenta?\n\nEsta acción es irreversible. Se borrarán todos tus datos, entrenamientos y progreso.\n\nEscribe "borrar" para confirmar.')) {
            // Additional safety check prompt could be added here, but simplest is just confirm
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('No hay sesión activa');
                    return;
                }

                await axios.delete(`${API_URL}/users/${userId}/account`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                alert('Tu cuenta ha sido eliminada correctamente.');

                // Clear local storage and redirect
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/login');

            } catch (err) {
                console.error('Delete account error:', err);
                alert('Error al eliminar la cuenta: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const handleUnlink = async () => {
        if (!profile.coach_id) return;

        if (window.confirm(t('profile.confirmUnlink') || 'Are you sure you want to unlink from your coach? You will lose access to assignments.')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/users/${profile.id}/connection/${profile.coach_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert(t('profile.unlinkSuccess') || 'Unlinked successfully');
                loadProfile();
                // Optionally refresh user context or redirect
                window.location.reload();
            } catch (err) {
                console.error('Unlink error:', err);
                alert(t('profile.unlinkError') || 'Failed to unlink');
            }
        }
    };

    // --- REFERRAL SYSTEM LOGIC ---
    const [referralModalOpen, setReferralModalOpen] = useState(false);
    const [referralStats, setReferralStats] = useState(null);

    const openReferralModal = async () => {
        setReferralModalOpen(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/referrals/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReferralStats(res.data);
        } catch (err) {
            console.error("Error loading referral stats", err);
        }
    };

    const ReferralModal = () => {
        if (!referralModalOpen) return null;

        const copyCode = () => {
            if (referralStats?.referralCode) {
                navigator.clipboard.writeText(referralStats.referralCode);
                alert("Código copiado!");
            }
        };

        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
            }}>
                <div style={{
                    background: styles.cardBg, padding: '2rem', borderRadius: styles.borderRadius,
                    maxWidth: '500px', width: '90%', border: styles.border,
                    boxShadow: styles.shadow,
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: currentTheme === 'neon' ? '#00f2ff' : styles.primary, marginTop: 0 }}>🚀 Programa Win-Win</h2>

                    <div style={{ background: currentTheme === 'neon' ? 'linear-gradient(45deg, #00f2ff22, #0080ff22)' : 'rgba(37, 99, 235, 0.1)', padding: '15px', borderRadius: '10px', margin: '20px 0' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: currentTheme === 'neon' ? '#fff' : styles.text }}>¡Dales 20%, Gana 10%!</h3>
                        <p style={{ color: styles.subText, fontSize: '0.9rem', margin: 0 }}>
                            Invita a otros entrenadores. Ellos reciben <strong>20% de descuento</strong> en su primer mes.<br />
                            Tú ganas <strong>10% de comisión</strong> en cada pago que hagan, ¡de por vida!
                        </p>
                    </div>

                    {referralStats ? (
                        <div>
                            <p style={{ color: styles.subText, marginBottom: '5px' }}>Tu Código Único</p>
                            <div
                                onClick={copyCode}
                                style={{
                                    background: styles.inputBg, padding: '1rem', borderRadius: '8px',
                                    fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px',
                                    color: styles.text, cursor: 'pointer', border: '1px dashed ' + (currentTheme === 'neon' ? '#555' : '#ccc'),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}>
                                {referralStats.referralCode || 'GENERANDO...'}
                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>📋</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                                <div style={{ background: currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : '#F3F4F6', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: styles.text }}>{referralStats.referralCount}</div>
                                    <div style={{ color: styles.subText, fontSize: '0.8rem' }}>Referidos</div>
                                </div>
                                <div style={{ background: currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : '#F3F4F6', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: currentTheme === 'neon' ? '#00f2ff' : styles.primary }}>${referralStats.totalEarnings}</div>
                                    <div style={{ color: styles.subText, fontSize: '0.8rem' }}>Ganancias Totales</div>
                                </div>
                                <div style={{ background: currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : '#F3F4F6', padding: '1rem', borderRadius: '8px', gridColumn: '1 / -1' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: currentTheme === 'neon' ? '#F3BA2F' : styles.secondary }}>
                                        ${referralStats.currentBalance || 0}
                                    </div>
                                    <div style={{ color: styles.subText, fontSize: '0.8rem' }}>Balance Disponible</div>
                                </div>
                            </div>

                            {referralStats.recentReferrals && referralStats.recentReferrals.length > 0 && (
                                <div style={{ textAlign: 'left', marginTop: '1.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>Últimos registros:</p>
                                    {referralStats.recentReferrals.map((ref, idx) => {
                                        const isInactive = !ref.subscription_tier || ref.subscription_tier === 'starter' || ref.subscription_tier === 'free';
                                        return (
                                            <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #333', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{ref.name}</div>
                                                    {Number(ref.total_earnings) > 0 && (
                                                        <div style={{ color: '#00C851', fontSize: '0.8rem' }}>+${Number(ref.total_earnings).toFixed(2)} e.</div>
                                                    )}
                                                </div>
                                                <span style={{ color: isInactive ? '#888' : '#00C851', fontStyle: isInactive ? 'italic' : 'normal' }}>
                                                    {isInactive ? 'Inactivo (Gratis)' : 'Activo'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p>Cargando estadísticas...</p>
                    )}

                    <button
                        onClick={() => setReferralModalOpen(false)}
                        style={{
                            marginTop: '2rem', padding: '10px 20px',
                            background: 'transparent', border: '1px solid #555',
                            color: '#ccc', borderRadius: '8px', cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        );
    };


    // Subscription Logic
    const [showPlans, setShowPlans] = useState(false);

    // Tiers definition for frontend (matching backend)
    const TIERS = [
        { id: 'starter', name: 'Starter', trainees: 1, price: 'Free' },
        { id: 'bronze', name: 'Bronze', trainees: 4, price: '$15/mo' },
        { id: 'silver', name: 'Silver', trainees: 10, price: '$30/mo' },
        { id: 'gold', name: 'Gold', trainees: 25, price: '$80/mo' },
        { id: 'olympian', name: 'Olympian', trainees: 'Unlimited', price: '$100/mo' }
    ];

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);

    const handleUpgrade = (tier) => {
        if (tier.id === profile.subscription_tier) return;
        setSelectedUpgradePlan(tier);
        setPaymentModalOpen(true);
    };

    const PaymentModal = () => {
        const [paymentMethod, setPaymentMethod] = useState('bolivares'); // 'bolivares' or 'binance'

        if (!paymentModalOpen || !selectedUpgradePlan) return null;

        const copyToClipboard = (text, label) => {
            navigator.clipboard.writeText(text);
            alert(`${label} copied to clipboard!`);
        };

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    background: styles.cardBg,
                    padding: '2rem',
                    borderRadius: styles.borderRadius,
                    maxWidth: '500px',
                    width: '90%',
                    border: currentTheme === 'neon' ? '1px solid #FFD700' : styles.border,
                    boxShadow: styles.shadow
                }}>
                    <h2 style={{ color: currentTheme === 'neon' ? '#FFD700' : styles.text, marginTop: 0, textAlign: 'center', marginBottom: '5px' }}>Upgrade to {selectedUpgradePlan.name}</h2>
                    <p style={{ textAlign: 'center', color: styles.subText, marginTop: 0 }}>Select your payment method</p>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: styles.border, marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setPaymentMethod('bolivares')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: paymentMethod === 'bolivares' ? '#FFD700' : (currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : styles.inputBg),
                                color: paymentMethod === 'bolivares' ? '#000' : styles.subText,
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🇻🇪 Bolivares
                        </button>
                        <button
                            onClick={() => setPaymentMethod('binance')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: paymentMethod === 'binance' ? '#F3BA2F' : (currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : styles.inputBg),
                                color: paymentMethod === 'binance' ? '#000' : styles.subText,
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🟡 Binance / Crypto
                        </button>
                    </div>

                    <div style={{ background: styles.inputBg, padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>

                        {/* Calculate Discount for Modal */}
                        {(() => {
                            const hasDiscount = (profile.referred_by || profile.referredBy) &&
                                !(profile.referral_discount_used || profile.referralDiscountUsed) &&
                                (profile.subscription_tier === 'starter' || profile.subscriptionTier === 'starter' || !profile.subscription_tier);

                            const originalPriceNum = parseFloat(selectedUpgradePlan.price.replace('$', '').replace('/mo', ''));
                            const finalPriceNum = hasDiscount && originalPriceNum > 0 ? originalPriceNum * 0.8 : originalPriceNum;


                            return paymentMethod === 'bolivares' ? (
                                <>
                                    <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#ccc' }}>Amount to Pay (Rate: {exchangeRate} Bs/$)</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ffff' }}>
                                            Bs {(finalPriceNum * exchangeRate).toLocaleString('es-VE')}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                            {hasDiscount ? (
                                                <span>
                                                    <s style={{ marginRight: '5px' }}>{selectedUpgradePlan.price}</s>
                                                    <span style={{ color: '#00D1FF', fontWeight: 'bold' }}>${finalPriceNum.toFixed(2)}/mo</span>
                                                </span>
                                            ) : (
                                                `(${selectedUpgradePlan.price})`
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ borderTop: styles.border, paddingTop: '15px' }}>
                                        {[
                                            { label: 'Bank', value: 'Banco Nacional de Crédito (0175)' },
                                            { label: 'ID / C.I.', value: 'V-26.242.801' },
                                            { label: 'Phone', value: '0412.785.4824' }
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => copyToClipboard(item.value, item.label)}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '10px',
                                                    padding: '8px',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    background: currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : styles.inputBg
                                                }}
                                                title="Click to copy"
                                            >
                                                <span style={{ color: styles.subText }}>{item.label}:</span>
                                                <span style={{ color: styles.text, fontWeight: 'bold' }}>{item.value} 📋</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: styles.subText }}>Amount to Pay</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: currentTheme === 'neon' ? '#F3BA2F' : styles.secondary }}>
                                            {hasDiscount ? (
                                                <>
                                                    <s style={{ fontSize: '1.2rem', color: styles.subText, marginRight: '10px' }}>{selectedUpgradePlan.price.replace('/mo', '')}</s>
                                                    {finalPriceNum} USDT
                                                </>
                                            ) : (
                                                `${selectedUpgradePlan.price.replace('/mo', '')} USDT`
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: styles.subText }}>Network: TRC20 (Tron)</div>
                                    </div>

                                    <div style={{ borderTop: styles.border, paddingTop: '15px' }}>
                                        {[
                                            { label: 'Binance ID', value: '36180847' },
                                            { label: 'Wallet (TRC20)', value: 'TMD6CaL9TVLXugA7ghn61DSqJcHouKZK8h' }
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => copyToClipboard(item.value, item.label)}
                                                style={{
                                                    marginBottom: '10px',
                                                    padding: '10px',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    background: currentTheme === 'neon' ? 'rgba(255,255,255,0.05)' : styles.inputBg
                                                }}
                                                title="Click to copy"
                                            >
                                                <div style={{ color: styles.subText, fontSize: '0.8rem', marginBottom: '4px' }}>{item.label}:</div>
                                                <div style={{ color: styles.text, fontSize: '0.9rem', wordBreak: 'break-all' }}>{item.value} 📋</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '10px', color: '#ff4444', fontSize: '0.8rem', textAlign: 'center' }}>
                                        ⚠️ Only send USDT on TRC20 network.
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        After payment, please send the screenshot to our support team for activation.
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => window.open('https://wa.me/584127854824', '_blank')}
                            style={{ flex: 1, padding: '12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            WhatsApp
                        </button>
                        <button
                            onClick={() => window.open('mailto:duplatraining@gmail.com?subject=Subscription Upgrade Payment Proof', '_blank')}
                            style={{ flex: 1, padding: '12px', background: '#EA4335', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Email
                        </button>
                        <button
                            onClick={() => setPaymentModalOpen(false)}
                            style={{
                                flex: 0.5,
                                padding: '12px',
                                background: 'transparent',
                                border: styles.border,
                                color: styles.subText,
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const currentTierInfo = TIERS.find(t => t.id === (profile?.subscription_tier || 'starter')) || TIERS[0];

    if (!profile) {
        return <div>Cargando perfil...</div>;
    }

    return (
        <div className="user-profile" style={{
            backgroundColor: styles.bg,
            color: styles.text,
            transition: 'all 0.3s ease',
            minHeight: '100vh',
            fontFamily: styles.font
        }}>
            <div className="profile-header" style={{
                background: currentTheme === 'light' ? '#fff' : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
                boxShadow: styles.shadow,
                borderRadius: styles.borderRadius,
                margin: '20px',
                padding: '20px',
                border: styles.border
            }}>
                <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                    <button
                        onClick={toggleTheme}
                        style={{
                            background: currentTheme === 'neon' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                            border: '1px solid ' + (currentTheme === 'neon' ? 'rgba(255,255,255,0.2)' : '#E5E7EB'),
                            color: styles.text,
                            padding: '8px 12px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            boxShadow: styles.shadow
                        }}
                    >
                        {currentTheme === 'neon' ? '☀️ Light Mode' : '🌙 Neon Mode'}
                    </button>
                </div>

                <div className="profile-pic-container">
                    <img
                        src={profilePicPreview || (profilePicUrl ? `${BASE_URL}${profilePicUrl}` : 'https://via.placeholder.com/150')}
                        alt="Profile"
                        className="profile-pic"
                        style={{
                            border: '4px solid ' + (currentTheme === 'neon' ? '#00D1FF' : '#fff'),
                            boxShadow: styles.shadow
                        }}
                    />
                    {editable && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleProfilePicChange}
                                style={{ display: 'none' }}
                                id="profile-pic-input"
                            />
                            <label htmlFor="profile-pic-input" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block', marginBottom: '0.5rem' }}>
                                Seleccionar Imagen
                            </label>
                            {profilePicFile && (
                                <button
                                    onClick={handleProfilePicUpload}
                                    className="btn-primary"
                                    disabled={uploadingPic}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    {uploadingPic ? 'Subiendo...' : 'Subir'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="profile-info">
                    <h2 style={{ color: styles.text }}>{profile.name}</h2>
                    <p className="profile-role" style={{ color: styles.subText }}>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</p>
                    <p className="profile-email" style={{ color: styles.subText }}>{profile.email}</p>

                    {/* Subscription Badge */}
                    {profile.role === 'coach' && (
                        <div style={{
                            display: 'inline-block',
                            marginTop: '10px',
                            padding: '5px 12px',
                            background: currentTheme === 'neon' ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#FEF3C7',
                            borderRadius: '20px',
                            color: currentTheme === 'neon' ? '#000' : '#D97706',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            border: currentTheme === 'light' ? '1px solid #FCD34D' : 'none'
                        }}>
                            {currentTierInfo.name} {t('profile.plan')}
                        </div>
                    )}

                    {/* Unlink Coach Button (Trainee only) */}
                    {profile.role === 'trainee' && profile.assigned_coach && (
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ color: styles.subText, fontSize: '0.9rem', marginBottom: '5px' }}>
                                Coach: <strong style={{ color: styles.text }}>{profile.assigned_coach}</strong>
                            </p>
                            <button
                                onClick={handleUnlink}
                                style={{
                                    background: 'rgba(255, 71, 87, 0.1)',
                                    border: '1px solid #ff4757',
                                    color: '#ff4757',
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {t('profile.unlink') || 'Unlink from Coach'}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end', marginTop: '60px' }}>
                    <button
                        onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}
                        style={{
                            background: currentTheme === 'neon' ? 'rgba(255,255,255,0.1)' : '#fff',
                            border: styles.border,
                            color: styles.text,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: currentTheme === 'light' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        🌐 {i18n.language === 'en' ? 'ES' : 'EN'}
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                        className="btn-danger"
                        style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                    >
                        {t('profile.logout')}
                    </button>
                </div>
            </div>

            {/* Trainee Subscription Access Section */}
            {profile.role === 'trainee' && profile.coach_subscription_end_date && (
                <div style={{
                    marginTop: '2rem',
                    marginBottom: '2rem',
                    background: currentTheme === 'neon' ? 'rgba(0, 255, 255, 0.05)' : '#fff',
                    border: currentTheme === 'neon' ? '1px solid rgba(0, 255, 255, 0.2)' : styles.border,
                    borderRadius: styles.borderRadius,
                    padding: '1.5rem',
                    boxShadow: styles.shadow
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: currentTheme === 'neon' ? '#00ffff' : styles.primary }}>
                        📅 Subscription Access
                    </h3>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Status</div>
                            <div style={{
                                color: profile.coach_subscription_status === 'active' ? (currentTheme === 'neon' ? '#00ff88' : '#059669') : '#ff4444',
                                fontWeight: 'bold'
                            }}>
                                {profile.coach_subscription_status === 'active' ? 'Active' : 'Expired / Inactive'}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Access Expires</div>
                            {(() => {
                                const endDate = new Date(profile.coach_subscription_end_date);
                                const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div style={{
                                        color: daysLeft <= 3 ? (currentTheme === 'neon' ? '#ff4444' : styles.accent) : styles.text,
                                        fontWeight: daysLeft <= 3 ? 'bold' : 'normal'
                                    }}>
                                        {endDate.toLocaleDateString()}
                                        {daysLeft > 0 && daysLeft <= 7 && (
                                            <span style={{ fontSize: '0.8rem', marginLeft: '5px' }}>
                                                (⚠️ {daysLeft} days left)
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    <p style={{ color: styles.subText, fontSize: '0.8rem', marginTop: '1rem', fontStyle: 'italic' }}>
                        * Access is managed by your coach's subscription content level.
                    </p>
                </div>
            )}

            {/* Coach Subscription Section */}
            {profile.role === 'coach' && !editing && (
                <div style={{
                    marginTop: '2rem',
                    marginBottom: '2rem',
                    background: currentTheme === 'neon' ? 'rgba(255, 215, 0, 0.05)' : '#fff',
                    border: currentTheme === 'neon' ? '1px solid rgba(255, 215, 0, 0.2)' : styles.border,
                    borderRadius: styles.borderRadius,
                    padding: '1.5rem',
                    boxShadow: styles.shadow
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#FFD700' }}>👑 Subscription</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowPlans(!showPlans)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #FFD700',
                                    color: '#FFD700',
                                    padding: '5px 15px',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPlans ? 'Hide Plans' : 'Manage Subscription'}
                            </button>
                        </div>
                    </div>

                    {!showPlans ? (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Current Plan</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: styles.text }}>{currentTierInfo.name}</div>
                            </div>
                            <div>
                                <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Trainee Limit</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: styles.text }}>
                                    {currentTierInfo.trainees === 'Unlimited' ? '∞ Unlimited' : `${currentTierInfo.trainees} Trainees`}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Status</div>
                                <div style={{ color: styles.secondary, fontWeight: 'bold' }}>Active</div>
                            </div>
                            {/* Subscription Dates Display */}
                            {profile.subscription_start_date && profile.subscription_end_date && (
                                <div style={{
                                    width: '100%', marginTop: '1rem',
                                    borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem',
                                    display: 'flex', gap: '2rem'
                                }}>
                                    <div>
                                        <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Started</div>
                                        <div style={{ color: styles.text }}>
                                            {new Date(profile.subscription_start_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: styles.subText, fontSize: '0.9rem' }}>Expires</div>
                                        {(() => {
                                            const endDate = new Date(profile.subscription_end_date);
                                            const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <div style={{
                                                    color: daysLeft <= 3 ? (currentTheme === 'neon' ? '#ff4444' : styles.accent) : styles.text,
                                                    fontWeight: daysLeft <= 3 ? 'bold' : 'normal'
                                                }}>
                                                    {endDate.toLocaleDateString()}
                                                    {daysLeft <= 3 && (
                                                        <span style={{ fontSize: '0.8rem', marginLeft: '5px' }}>
                                                            (⚠️ {daysLeft} days left)
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {TIERS.map(tier => {
                                const isCurrent = tier.id === (profile.subscription_tier || 'starter');
                                return (
                                    <div key={tier.id} style={{
                                        background: isCurrent ? (currentTheme === 'neon' ? 'rgba(255, 215, 0, 0.1)' : '#FEF3C7') : styles.cardBg,
                                        border: isCurrent ? `1px solid ${styles.secondary}` : styles.border,
                                        borderRadius: styles.borderRadius,
                                        padding: '1rem',
                                        textAlign: 'center',
                                        cursor: isCurrent ? 'default' : 'pointer',
                                        transition: 'transform 0.2s',
                                        opacity: isCurrent ? 1 : 0.8,
                                        boxShadow: styles.shadow
                                    }}
                                        onClick={() => !isCurrent && handleUpgrade(tier)}
                                        onMouseEnter={(e) => !isCurrent && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                        onMouseLeave={(e) => !isCurrent && (e.currentTarget.style.transform = 'translateY(0)')}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px', color: isCurrent ? styles.secondary : styles.text }}>
                                            {tier.name}
                                        </div>

                                        {/* Price Display with Discount Logic */}
                                        <div style={{ marginBottom: '10px' }}>
                                            {(() => {
                                                const hasDiscount = (profile.referred_by || profile.referredBy) &&
                                                    !(profile.referral_discount_used || profile.referralDiscountUsed) &&
                                                    (profile.subscription_tier === 'starter' || profile.subscriptionTier === 'starter' || !profile.subscription_tier);

                                                if (hasDiscount && tier.price !== 'Free') {
                                                    const numPrice = parseFloat(tier.price.replace('$', '').replace('/mo', ''));
                                                    const discountedPrice = (numPrice * 0.8).toFixed(2);
                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <span style={{ textDecoration: 'line-through', color: styles.subText, fontSize: '1rem' }}>
                                                                {tier.price}
                                                            </span>
                                                            <span style={{ color: styles.primary, fontWeight: 'bold', fontSize: '1.5rem' }}>
                                                                ${discountedPrice}/mo
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return <div style={{ fontSize: '1.5rem' }}>{tier.price}</div>;
                                            })()}
                                        </div>

                                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '15px' }}>
                                            {tier.trainees === 'Unlimited' ? 'Unlimited Trainees' : `Up to ${tier.trainees} Trainees`}
                                        </div>
                                        {isCurrent ? (
                                            <div style={{ background: styles.secondary, color: currentTheme === 'neon' ? '#000' : '#fff', padding: '5px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                CURRENT PLAN
                                            </div>
                                        ) : (
                                            <button style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: 'transparent',
                                                border: currentTheme === 'neon' ? '1px solid rgba(255,255,255,0.3)' : '1px solid #ccc',
                                                color: styles.text,
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}>
                                                Select Plan
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Apply Referral Code Section */}
            {profile.role === 'coach' && !profile.referred_by && !editing && (
                <div style={{
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    background: styles.cardBg,
                    border: '1px dashed ' + (currentTheme === 'neon' ? 'rgba(255,255,255,0.1)' : '#ccc'),
                    borderRadius: styles.borderRadius,
                    padding: '1.5rem',
                    textAlign: 'center',
                    boxShadow: styles.shadow
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ccc' }}>¿Tienes un código de referido?</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
                        <input
                            type="text"
                            placeholder="Ingresa el código aquí"
                            value={referralCodeInput}
                            onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '5px',
                                border: styles.border,
                                background: styles.inputBg,
                                color: styles.text,
                                textAlign: 'center',
                                letterSpacing: '1px'
                            }}
                        />
                        <button
                            onClick={handleApplyReferralCode}
                            disabled={applyingReferral || !referralCodeInput.trim()}
                            style={{
                                padding: '10px 20px',
                                background: '#00D1FF',
                                color: '#000',
                                border: 'none',
                                borderRadius: '5px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: !referralCodeInput.trim() ? 0.5 : 1
                            }}
                        >
                            {applyingReferral ? '...' : 'Canjear'}
                        </button>
                    </div>
                </div>
            )}

            {/* Win-Win Program Section (For ALL Users) */}
            {!editing && (
                <div style={{
                    marginTop: '1rem',
                    marginBottom: '2rem',
                    background: currentTheme === 'neon' ? 'linear-gradient(45deg, rgba(0, 242, 255, 0.05), rgba(0, 128, 255, 0.05))' : '#fff',
                    border: currentTheme === 'neon' ? '1px solid rgba(0, 242, 255, 0.2)' : styles.border,
                    borderRadius: styles.borderRadius,
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: styles.shadow
                }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#00f2ff' }}>🚀 Win-Win Program</h3>
                        <p style={{ margin: '5px 0 0 0', color: styles.subText, fontSize: '0.9rem' }}>
                            {profile.role === 'coach' ?
                                'Invite coaches, earn commissions!' :
                                'Invite coaches and earn rewards!'}
                        </p>
                    </div>
                    <button
                        onClick={openReferralModal}
                        style={{
                            background: 'linear-gradient(45deg, #00f2ff, #0080ff)',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        👥 {t('referral.button') || 'Ver Referidos'}
                    </button>
                </div>
            )}

            {/* Edit Profile Form */}
            {/* Edit Profile Form */}
            {editing ? (
                <form onSubmit={handleSubmit} className="profile-form" style={{
                    background: styles.cardBg,
                    border: styles.border,
                    padding: '20px',
                    borderRadius: styles.borderRadius,
                    boxShadow: styles.shadow
                }}>
                    <h3 style={{ color: styles.text }}>Editar Perfil</h3>

                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                            style={{
                                background: styles.inputBg,
                                border: styles.border,
                                color: styles.text
                            }}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Edad</label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                className="form-input"
                                style={{
                                    background: styles.inputBg,
                                    border: styles.border,
                                    color: styles.text
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Peso (kg)</label>
                            <input
                                type="number"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                className="form-input"
                                style={{
                                    background: styles.inputBg,
                                    border: styles.border,
                                    color: styles.text
                                }}
                                placeholder="kg"
                            />
                        </div>

                        <div className="form-group">
                            <label>Altura (cm)</label>
                            <input
                                type="number"
                                value={formData.height}
                                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                className="form-input"
                                style={{
                                    background: styles.inputBg,
                                    border: styles.border,
                                    color: styles.text
                                }}
                                placeholder="cm"
                            />
                        </div>

                        <div className="form-group">
                            <label>Sexo</label>
                            <select
                                value={formData.sex}
                                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                className="form-input"
                                style={{
                                    background: styles.inputBg,
                                    border: styles.border,
                                    color: styles.text
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Male">Hombre</option>
                                <option value="Female">Mujer</option>
                                <option value="Other">Otros</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="form-input"
                            style={{
                                background: styles.inputBg,
                                border: styles.border,
                                color: styles.text
                            }}
                            placeholder="+1234567890"
                        />
                    </div>

                    <div className="form-group">
                        <label>Gimnasio</label>
                        <input
                            type="text"
                            value={formData.gym}
                            onChange={(e) => setFormData({ ...formData, gym: e.target.value })}
                            className="form-input"
                            style={{
                                background: styles.inputBg,
                                border: styles.border,
                                color: styles.text
                            }}
                            placeholder="Gold's Gym"
                        />
                    </div>

                    <div className="form-group">
                        <label>Notas (Problemas de salud, lesiones, restricciones dietéticas, etc.)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="form-input"
                            style={{
                                background: styles.inputBg,
                                border: styles.border,
                                color: styles.text,
                                resize: 'vertical'
                            }}
                            rows="4"
                            placeholder="Cualquier información de salud importante..."
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary">Guardar Cambios</button>
                        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
                    </div>
                </form>
            ) : (
                <div className="profile-details" style={{
                    background: styles.cardBg,
                    border: styles.border,
                    padding: '20px',
                    borderRadius: styles.borderRadius,
                    boxShadow: styles.shadow
                }}>
                    <h3 style={{ color: styles.text }}>{t('profile.title')} Details</h3>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Edad:</strong>
                        <span style={{ color: styles.subText }}>{profile.age || 'No especificado'}</span>
                    </div>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Peso:</strong>
                        <span style={{ color: styles.subText }}>{profile.weight ? `${profile.weight} kg` : 'No especificado'}</span>
                    </div>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Altura:</strong>
                        <span style={{ color: styles.subText }}>{profile.height ? `${profile.height} cm` : 'No especificado'}</span>
                    </div>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Sexo:</strong>
                        <span style={{ color: styles.subText }}>{profile.sex || 'No especificado'}</span>
                    </div>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Teléfono:</strong>
                        <span style={{ color: styles.subText }}>{profile.phone || 'No especificado'}</span>
                    </div>

                    <div className="detail-row" style={{ borderBottom: styles.border }}>
                        <strong style={{ color: styles.text }}>Gimnasio:</strong>
                        <span style={{ color: styles.subText }}>{profile.gym || 'No especificado'}</span>
                    </div>

                    {profile.notes && (
                        <div className="detail-row" style={{ borderBottom: 'none' }}>
                            <strong style={{ color: styles.text }}>Notas:</strong>
                            <p className="profile-notes" style={{ color: styles.subText }}>{profile.notes}</p>
                        </div>
                    )}

                    {editable && (
                        <>
                            <button onClick={() => setEditing(true)} className="btn-primary" style={{ marginTop: '1rem', marginRight: '1rem' }}>
                                Editar Perfil
                            </button>

                            <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

                            <div className="danger-zone" style={{ padding: '1rem', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: '8px', background: 'rgba(255, 71, 87, 0.05)' }}>
                                <h4 style={{ color: '#ff4757', marginTop: 0 }}>Zona de Peligro</h4>
                                <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor asegúrate.
                                </p>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="btn-danger"
                                    style={{
                                        backgroundColor: '#ff4757',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    Eliminar Cuenta
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            <ReferralModal />
            <PaymentModal />
        </div>
    );
}

export default UserProfile;
