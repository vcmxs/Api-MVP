"use client";

import Link from 'next/link';
import { useT, useLanguage } from '@/lib/i18n';
import '@/styles/LandingPage.css';

export default function PrivacyPage() {
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
                    <span className="lp-label">Legal</span>
                    <h1 className="lp-headline" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                        {language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
                    </h1>
                    <p>Last updated: April 25, 2026</p>
                </div>

                <div className="legal-content" style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '1.1rem' }}>
                    {language === 'es' ? (
                        <>
                            <p>En DUPLA, accesible desde duplapp.win, una de nuestras principales prioridades es la privacidad de nuestros visitantes. Este documento de Política de Privacidad contiene tipos de información que es recopilada y registrada por DUPLA y cómo la utilizamos.</p>
                            
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>1. Información que recopilamos</h2>
                            <p>Recopilamos información personal que usted nos proporciona, como su nombre, dirección de correo electrónico, datos de contacto e información de salud o estado físico necesaria para proporcionar nuestros servicios de entrenamiento personalizado.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>2. Cómo utilizamos su información</h2>
                            <p>Utilizamos la información que recopilamos de diversas maneras, incluyendo para:</p>
                            <ul>
                                <li>Proporcionar, operar y mantener nuestra aplicación</li>
                                <li>Mejorar, personalizar y expandir nuestra aplicación</li>
                                <li>Comprender y analizar cómo utiliza nuestra aplicación</li>
                                <li>Desarrollar nuevos productos, servicios, características y funcionalidades</li>
                                <li>Comunicarnos con usted para brindarle soporte y actualizaciones</li>
                            </ul>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>3. Seguridad de los datos</h2>
                            <p>La seguridad de sus datos es importante para nosotros. Implementamos medidas de seguridad estándar de la industria para proteger su información personal contra el acceso no autorizado o la divulgación.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>4. Eliminación de datos</h2>
                            <p>Usted tiene derecho a solicitar la eliminación de sus datos personales. Puede hacerlo a través de la sección "Eliminar Cuenta" en nuestra aplicación o visitando nuestra página de <Link href="/delete-account" style={{ color: '#8b5cf6' }}>Eliminación de Cuenta</Link>.</p>
                        </>
                    ) : (
                        <>
                            <p>At DUPLA, accessible from duplapp.win, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by DUPLA and how we use it.</p>
                            
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>1. Information We Collect</h2>
                            <p>We collect personal information that you provide to us, such as your name, email address, contact details, and health or fitness data necessary to provide our personalized training services.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>2. How We Use Your Information</h2>
                            <p>We use the information we collect in various ways, including to:</p>
                            <ul>
                                <li>Provide, operate, and maintain our application</li>
                                <li>Improve, personalize, and expand our application</li>
                                <li>Understand and analyze how you use our application</li>
                                <li>Develop new products, services, features, and functionality</li>
                                <li>Communicate with you for support and updates</li>
                            </ul>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>3. Data Security</h2>
                            <p>The security of your data is important to us. We implement industry-standard security measures to protect your personal information from unauthorized access or disclosure.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>4. Data Deletion</h2>
                            <p>You have the right to request the deletion of your personal data. You can do this through the "Delete Account" section in our app or by visiting our <Link href="/delete-account" style={{ color: '#8b5cf6' }}>Account Deletion</Link> page.</p>
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
