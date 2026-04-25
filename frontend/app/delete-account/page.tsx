"use client";

import Link from 'next/link';
import { useT, useLanguage } from '@/lib/i18n';
import '@/styles/LandingPage.css';

export default function DeleteAccountPage() {
    const { t } = useT();
    const { language, setLanguage } = useLanguage();

    const toggleLang = () => setLanguage(language === 'es' ? 'en' : 'es');

    return (
        <div className="lp">
            <nav className="lp-nav">
                <Link href="/" className="lp-logo">
                    <img src="/icon.png" alt="Dupla" />
                    DUPLA
                </Link>
                <div className="lp-nav-right">
                    <button className="lp-lang" onClick={toggleLang}>
                        {language === 'es' ? '🇺🇸 EN' : '🇻🇪 ES'}
                    </button>
                    <Link href="/login" className="lp-nav-login">{t('landing.nav.signIn')}</Link>
                </div>
            </nav>

            <section className="lp-section" style={{ paddingTop: '120px', maxWidth: '800px', margin: '0 auto' }}>
                <div className="lp-section-head" style={{ textAlign: 'left', marginBottom: '40px' }}>
                    <span className="lp-label">Support</span>
                    <h1 className="lp-headline" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                        {language === 'es' ? 'Eliminar Cuenta y Datos' : 'Delete Account & Data'}
                    </h1>
                    <p>{language === 'es' ? 'Instrucciones para eliminar tu cuenta y datos personales' : 'Instructions to delete your account and personal data'}</p>
                </div>

                <div className="legal-content" style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '1.1rem' }}>
                    {language === 'es' ? (
                        <>
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>¿Cómo puedo eliminar mi cuenta?</h2>
                            <p>Puedes eliminar tu cuenta de dos maneras:</p>
                            <ol style={{ marginLeft: '20px', marginBottom: '20px' }}>
                                <li><strong>Desde la aplicación móvil:</strong> Inicia sesión, ve a Configuración (Settings) y selecciona "Eliminar Cuenta".</li>
                                <li><strong>Solicitud por correo electrónico:</strong> Envía un correo a <a href="mailto:duplatraining@gmail.com" style={{ color: '#8b5cf6' }}>duplatraining@gmail.com</a> desde la dirección de correo asociada a tu cuenta.</li>
                            </ol>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>¿Qué datos se eliminan?</h2>
                            <p>Al procesar tu solicitud, eliminaremos permanentemente:</p>
                            <ul>
                                <li>Tu perfil de usuario (nombre, correo, foto)</li>
                                <li>Tu historial de entrenamientos y registros</li>
                                <li>Tus planes de entrenamiento personalizados</li>
                                <li>Cualquier dato de salud o fitness registrado</li>
                            </ul>
                            <p style={{ marginTop: '20px' }}><strong>Nota:</strong> Este proceso es irreversible. Una vez eliminados, los datos no podrán ser recuperados.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>Plazo de eliminación</h2>
                            <p>Las solicitudes realizadas por correo electrónico se procesan en un plazo máximo de 48-72 horas hábiles.</p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>How can I delete my account?</h2>
                            <p>You can delete your account in two ways:</p>
                            <ol style={{ marginLeft: '20px', marginBottom: '20px' }}>
                                <li><strong>From the mobile app:</strong> Log in, go to Settings, and select "Delete Account".</li>
                                <li><strong>Email request:</strong> Send an email to <a href="mailto:duplatraining@gmail.com" style={{ color: '#8b5cf6' }}>duplatraining@gmail.com</a> from the email address associated with your account.</li>
                            </ol>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>What data is deleted?</h2>
                            <p>Upon processing your request, we will permanently delete:</p>
                            <ul>
                                <li>Your user profile (name, email, photo)</li>
                                <li>Your workout history and logs</li>
                                <li>Your personalized training plans</li>
                                <li>Any recorded health or fitness data</li>
                            </ul>
                            <p style={{ marginTop: '20px' }}><strong>Note:</strong> This process is irreversible. Once deleted, the data cannot be recovered.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>Deletion timeframe</h2>
                            <p>Requests made via email are processed within a maximum of 48-72 business hours.</p>
                        </>
                    )}
                </div>
            </section>

            <footer className="lp-footer">
                <Link href="/" className="lp-logo">
                    <img src="/icon.png" alt="Dupla" />
                    DUPLA
                </Link>
                <div className="lp-footer-links">
                    <Link href="/privacy">Privacy Policy</Link>
                    <span>·</span>
                    <Link href="/terms">Terms</Link>
                    <span>·</span>
                    <Link href="/delete-account">Delete Account</Link>
                </div>
                <p className="lp-copyright">{t('landing.footer.copyright')}</p>
            </footer>
        </div>
    );
}
