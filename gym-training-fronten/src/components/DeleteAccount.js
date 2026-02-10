import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

const DeleteAccount = () => {
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        // Note: For a real production app, you might want a specialized endpoint for this 
        // that sends a confirmation email instead of deleting immediately for security.
        // For this MVP, we will direct them to contact support or use the app.

        setTimeout(() => {
            setStatus('success');
        }, 1500);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '40px',
                borderRadius: '15px',
                maxWidth: '500px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h1 style={{ color: '#ff4757', marginBottom: '20px', textAlign: 'center' }}>{t('deleteAccountPage.title')}</h1>

                <div style={{ color: '#ccc', marginBottom: '30px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    <h3 style={{ color: '#fff', marginBottom: '10px' }}>{t('deleteAccountPage.requestTitle')}</h3>
                    <p style={{ marginBottom: '15px' }}>
                        <Trans i18nKey="deleteAccountPage.intro" />
                    </p>

                    <h4 style={{ color: '#fff', marginBottom: '5px' }}>{t('deleteAccountPage.howToTitle')}</h4>
                    <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                        <li><Trans i18nKey="deleteAccountPage.option1" /></li>
                        <li><Trans i18nKey="deleteAccountPage.option2" /></li>
                    </ul>

                    <h4 style={{ color: '#fff', marginBottom: '5px' }}>{t('deleteAccountPage.dataTitle')}</h4>
                    <p style={{ marginBottom: '10px' }}>
                        {t('deleteAccountPage.dataIntro')}
                    </p>
                    <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
                        <li>{t('deleteAccountPage.dataList.p1')}</li>
                        <li>{t('deleteAccountPage.dataList.p2')}</li>
                        <li>{t('deleteAccountPage.dataList.p3')}</li>
                        <li>{t('deleteAccountPage.dataList.p4')}</li>
                        <li>{t('deleteAccountPage.dataList.p5')}</li>
                    </ul>

                    <h4 style={{ color: '#fff', marginBottom: '5px' }}>{t('deleteAccountPage.retentionTitle')}</h4>
                    <p>
                        {t('deleteAccountPage.retentionText')}
                    </p>
                </div>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', color: '#fff', padding: '20px', backgroundColor: 'rgba(0,255,136,0.1)', borderRadius: '10px' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '10px' }}>{t('deleteAccountPage.successTitle')}</h3>
                        <p>{t('deleteAccountPage.successMessage')}</p>
                        <p style={{ marginTop: '10px', fontSize: '0.8em', color: '#aaa' }}>
                            {t('deleteAccountPage.successNote')}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#fff', marginBottom: '8px', fontWeight: 'bold' }}>{t('deleteAccountPage.emailLabel')}</label>
                            <input
                                type="email"
                                required
                                placeholder={t('deleteAccountPage.emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#ff4757',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: status === 'loading' ? 0.7 : 1,
                                fontSize: '1rem'
                            }}
                        >
                            {status === 'loading' ? t('deleteAccountPage.processing') : t('deleteAccountPage.submitButton')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DeleteAccount;
