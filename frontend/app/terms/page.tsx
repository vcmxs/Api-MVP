"use client";

import Link from 'next/link';
import { useT, useLanguage } from '@/lib/i18n';
import '@/styles/LandingPage.css';

export default function TermsPage() {
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
                        {language === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
                    </h1>
                    <p>Last updated: April 25, 2026</p>
                </div>

                <div className="legal-content" style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '1.1rem' }}>
                    {language === 'es' ? (
                        <>
                            <p>Bienvenido a DUPLA. Al acceder a nuestra aplicación y sitio web, usted acepta estar sujeto a estos términos y condiciones.</p>
                            
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>1. Uso de la Licencia</h2>
                            <p>Se concede permiso para descargar temporalmente una copia de la aplicación para uso personal y no comercial solamente.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>2. Descargo de Responsabilidad Médica</h2>
                            <p>DUPLA proporciona contenido de fitness y nutrición con fines informativos únicamente. No somos profesionales médicos. Antes de comenzar cualquier programa de ejercicios, debe consultar con su médico.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>3. Limitaciones</h2>
                            <p>En ningún caso DUPLA o sus proveedores serán responsables de cualquier daño surgido del uso o la imposibilidad de usar los materiales en nuestra aplicación.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>4. Ley Aplicable</h2>
                            <p>Cualquier reclamo relacionado con la aplicación de DUPLA se regirá por las leyes locales sin consideración a sus disposiciones sobre conflictos de leyes.</p>
                        </>
                    ) : (
                        <>
                            <p>Welcome to DUPLA. By accessing our app and website, you agree to be bound by these terms and conditions.</p>
                            
                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>1. Use License</h2>
                            <p>Permission is granted to temporarily download one copy of the app for personal, non-commercial use only.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>2. Medical Disclaimer</h2>
                            <p>DUPLA provides fitness and nutrition content for informational purposes only. We are not medical professionals. Before starting any exercise program, you should consult with your physician.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>3. Limitations</h2>
                            <p>In no event shall DUPLA or its suppliers be liable for any damages arising out of the use or inability to use the materials on our application.</p>

                            <h2 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>4. Governing Law</h2>
                            <p>Any claim related to DUPLA's app shall be governed by local laws without regard to its conflict of law provisions.</p>
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
