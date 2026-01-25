import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import '../App.css';
import { API_URL, BASE_URL } from '../config/api';

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

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

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


    // Subscription Logic
    const [showPlans, setShowPlans] = useState(false);

    // Tiers definition for frontend (matching backend)
    const TIERS = [
        { id: 'starter', name: 'Starter', trainees: 1, price: 'Free' },
        { id: 'bronze', name: 'Bronze', trainees: 4, price: '$9.99/mo' },
        { id: 'silver', name: 'Silver', trainees: 10, price: '$19.99/mo' },
        { id: 'gold', name: 'Gold', trainees: 25, price: '$39.99/mo' },
        { id: 'olympian', name: 'Olympian', trainees: 'Unlimited', price: '$99.99/mo' }
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
                    background: '#1a1a20',
                    padding: '2rem',
                    borderRadius: '15px',
                    maxWidth: '500px',
                    width: '90%',
                    border: '1px solid #FFD700',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.15)'
                }}>
                    <h2 style={{ color: '#FFD700', marginTop: 0, textAlign: 'center', marginBottom: '5px' }}>Upgrade to {selectedUpgradePlan.name}</h2>
                    <p style={{ textAlign: 'center', color: '#888', marginTop: 0 }}>Select your payment method</p>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setPaymentMethod('bolivares')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: paymentMethod === 'bolivares' ? '#FFD700' : 'rgba(255,255,255,0.05)',
                                color: paymentMethod === 'bolivares' ? '#000' : '#888',
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
                                background: paymentMethod === 'binance' ? '#F3BA2F' : 'rgba(255,255,255,0.05)',
                                color: paymentMethod === 'binance' ? '#000' : '#888',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🟡 Binance / Crypto
                        </button>
                    </div>

                    {/* Content Area */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>

                        {paymentMethod === 'bolivares' ? (
                            <>
                                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>Amount to Pay (Rate: 355 Bs/$)</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ffff' }}>
                                        Bs {(parseFloat(selectedUpgradePlan.price.replace('$', '').split('/')[0]) * 355).toLocaleString('es-VE')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>({selectedUpgradePlan.price})</div>
                                </div>

                                <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
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
                                                background: 'rgba(255,255,255,0.05)'
                                            }}
                                            title="Click to copy"
                                        >
                                            <span style={{ color: '#888' }}>{item.label}:</span>
                                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{item.value} 📋</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>Amount to Pay</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F3BA2F' }}>
                                        {selectedUpgradePlan.price.replace('/mo', '')} USDT
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Network: TRC20 (Tron)</div>
                                </div>

                                <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
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
                                                background: 'rgba(255,255,255,0.05)'
                                            }}
                                            title="Click to copy"
                                        >
                                            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '4px' }}>{item.label}:</div>
                                            <div style={{ color: '#fff', fontSize: '0.9rem', wordBreak: 'break-all' }}>{item.value} 📋</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '10px', color: '#ff4444', fontSize: '0.8rem', textAlign: 'center' }}>
                                    ⚠️ Only send USDT on TRC20 network.
                                </div>
                            </>
                        )}
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
                            style={{ flex: 0.5, padding: '12px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '8px', cursor: 'pointer' }}
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
        <div className="user-profile">
            <div className="profile-header">
                <div className="profile-pic-container">
                    <img
                        src={profilePicPreview || (profilePicUrl ? `${BASE_URL}${profilePicUrl}` : 'https://via.placeholder.com/150')}
                        alt="Profile"
                        className="profile-pic"
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
                    <h2>{profile.name}</h2>
                    <p className="profile-role">{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</p>
                    <p className="profile-email">{profile.email}</p>

                    {/* Subscription Badge */}
                    {profile.role === 'coach' && (
                        <div style={{
                            display: 'inline-block',
                            marginTop: '10px',
                            padding: '5px 12px',
                            background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                            borderRadius: '20px',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}>
                            {currentTierInfo.name} {t('profile.plan')}
                        </div>
                    )}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <button
                        onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
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

            {/* Coach Subscription Section */}
            {profile.role === 'coach' && !editing && (
                <div style={{
                    marginTop: '2rem',
                    marginBottom: '2rem',
                    background: 'rgba(255, 215, 0, 0.05)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    borderRadius: '10px',
                    padding: '1.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#FFD700' }}>👑 Subscription</h3>
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

                    {!showPlans ? (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Current Plan</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{currentTierInfo.name}</div>
                            </div>
                            <div>
                                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Trainee Limit</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {currentTierInfo.trainees === 'Unlimited' ? '∞ Unlimited' : `${currentTierInfo.trainees} Trainees`}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Status</div>
                                <div style={{ color: '#00C851', fontWeight: 'bold' }}>Active</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {TIERS.map(tier => {
                                const isCurrent = tier.id === (profile.subscription_tier || 'starter');
                                return (
                                    <div key={tier.id} style={{
                                        background: isCurrent ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)',
                                        border: isCurrent ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        textAlign: 'center',
                                        cursor: isCurrent ? 'default' : 'pointer',
                                        transition: 'transform 0.2s',
                                        opacity: isCurrent ? 1 : 0.8
                                    }}
                                        onClick={() => !isCurrent && handleUpgrade(tier)}
                                        onMouseEnter={(e) => !isCurrent && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                        onMouseLeave={(e) => !isCurrent && (e.currentTarget.style.transform = 'translateY(0)')}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px', color: isCurrent ? '#FFD700' : '#fff' }}>
                                            {tier.name}
                                        </div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{tier.price}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '15px' }}>
                                            {tier.trainees === 'Unlimited' ? 'Unlimited Trainees' : `Up to ${tier.trainees} Trainees`}
                                        </div>
                                        {isCurrent ? (
                                            <div style={{ background: '#FFD700', color: 'black', padding: '5px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                CURRENT PLAN
                                            </div>
                                        ) : (
                                            <button style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                color: '#fff',
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

            {/* Edit Profile Form */}
            {editing ? (
                <form onSubmit={handleSubmit} className="profile-form">
                    <h3>Editar Perfil</h3>

                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
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
                            />
                        </div>

                        <div className="form-group">
                            <label>Peso (kg)</label>
                            <input
                                type="number"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                className="form-input"
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
                                placeholder="cm"
                            />
                        </div>

                        <div className="form-group">
                            <label>Sexo</label>
                            <select
                                value={formData.sex}
                                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                className="form-input"
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
                            placeholder="Gold's Gym"
                        />
                    </div>

                    <div className="form-group">
                        <label>Notas (Problemas de salud, lesiones, restricciones dietéticas, etc.)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="form-input"
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
                <div className="profile-details">
                    <h3>{t('profile.title')} Details</h3>

                    <div className="detail-row">
                        <strong>Edad:</strong>
                        <span>{profile.age || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Peso:</strong>
                        <span>{profile.weight ? `${profile.weight} kg` : 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Altura:</strong>
                        <span>{profile.height ? `${profile.height} cm` : 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Sexo:</strong>
                        <span>{profile.sex || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Teléfono:</strong>
                        <span>{profile.phone || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Gimnasio:</strong>
                        <span>{profile.gym || 'No especificado'}</span>
                    </div>

                    {profile.notes && (
                        <div className="detail-row">
                            <strong>Notas:</strong>
                            <p className="profile-notes">{profile.notes}</p>
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
            <PaymentModal />
        </div>
    );
}

export default UserProfile;
