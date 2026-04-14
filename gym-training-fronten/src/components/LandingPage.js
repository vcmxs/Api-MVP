import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dashboardPreview from '../assets/dashboard-preview.jpg';
import './LandingPage.css';

const FEATURE_ICONS = ['🏋️', '📊', '🥗', '📈', '💬', '⏱️'];
const TIER_PRICES   = { starter: null, bronze: 15, silver: 30, gold: 50, olympian: 100 };
const TIER_DISABLED = { starter: [3, 4], bronze: [], silver: [], gold: [], olympian: [] };
const TIER_COLORS   = { starter: '#6B7280', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', olympian: '#8B5CF6' };
const TIER_BADGES   = { starter: '🆓', bronze: '🥉', silver: '🥈', gold: '🥇', olympian: '🏆' };
const TIER_ORDER    = ['starter', 'bronze', 'silver', 'gold', 'olympian'];

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const [selectedPlan, setSelectedPlan] = useState(null);

    const toggleLang = () => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');

    const features     = t('landing.features.items',    { returnObjects: true });
    const coachSteps   = t('landing.how.coachSteps',   { returnObjects: true });
    const traineeSteps = t('landing.how.traineeSteps', { returnObjects: true });

    return (
        <div className="lp">

            {/* ── Navbar ───────────────────────────────────────── */}
            <nav className="lp-nav">
                <Link to="/" className="lp-logo">
                    <img src="/icon.png" alt="Dupla" />
                    DUPLA
                </Link>
                <div className="lp-nav-right">
                    <button className="lp-lang" onClick={toggleLang}>
                        {i18n.language === 'es' ? '🇺🇸 EN' : '🇻🇪 ES'}
                    </button>
                    <Link to="/login" className="lp-nav-login">{t('landing.nav.signIn')}</Link>
                    <Link to="/register" className="lp-nav-cta">{t('landing.hero.ctaPrimary')}</Link>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="lp-hero">
                <div className="lp-hero-content">
                    <div className="lp-badge">
                        <span className="lp-dot" />
                        {t('landing.hero.badge')}
                    </div>

                    <h1 className="lp-headline">
                        {t('landing.hero.title1')}<br />
                        <span className="lp-gradient">{t('landing.hero.title2')}</span>
                    </h1>

                    <p className="lp-sub">{t('landing.hero.subtitle')}</p>

                    <div className="lp-hero-actions">
                        <Link to="/register" className="lp-btn-primary">{t('landing.hero.ctaPrimary')}</Link>
                        <Link to="/login"    className="lp-btn-ghost"  >{t('landing.hero.ctaSecondary')}</Link>
                    </div>

                    <div className="lp-stats">
                        {[
                            { val: t('landing.hero.stat1Value'), label: t('landing.hero.stat1Label') },
                            { val: t('landing.hero.stat2Value'), label: t('landing.hero.stat2Label') },
                            { val: t('landing.hero.stat3Value'), label: t('landing.hero.stat3Label') },
                        ].map((s, i) => (
                            <div key={i} className="lp-stat">
                                <span className="lp-stat-val">{s.val}</span>
                                <span className="lp-stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lp-hero-img">
                    <div className="lp-screen-frame">
                        <div className="lp-screen-bar">
                            <span /><span /><span />
                        </div>
                        <img src={dashboardPreview} alt="Dupla dashboard" />
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────── */}
            <section className="lp-section lp-features-section">
                <div className="lp-section-head">
                    <span className="lp-label">{t('landing.features.label')}</span>
                    <h2>{t('landing.features.title')}</h2>
                    <p>{t('landing.features.subtitle')}</p>
                </div>
                <div className="lp-features-grid">
                    {Array.isArray(features) && features.map((f, i) => (
                        <div className="lp-feature-card" key={i}>
                            <div className="lp-feature-icon">{FEATURE_ICONS[i]}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────── */}
            <section className="lp-section lp-how-section">
                <div className="lp-section-head">
                    <span className="lp-label">{t('landing.how.label')}</span>
                    <h2>{t('landing.how.title')}</h2>
                    <p>{t('landing.how.subtitle')}</p>
                </div>
                <div className="lp-how-grid">
                    {[
                        { cls: 'coaches',  label: t('landing.how.coachLabel'),   title: t('landing.how.coachTitle'),   steps: coachSteps,   color: 'var(--cyan)' },
                        { cls: 'trainees', label: t('landing.how.traineeLabel'), title: t('landing.how.traineeTitle'), steps: traineeSteps, color: 'var(--violet)' },
                    ].map(({ cls, label, title, steps, color }) => (
                        <div className={`lp-how-card ${cls}`} key={cls}>
                            <p className="lp-how-label" style={{ color }}>{label}</p>
                            <h3>{title}</h3>
                            <div className="lp-steps">
                                {Array.isArray(steps) && steps.map((s, i) => (
                                    <div className="lp-step" key={i}>
                                        <div className="lp-step-num" style={{ color, borderColor: color, background: `${color}18` }}>{i + 1}</div>
                                        <div>
                                            <strong>{s.title}</strong>
                                            <span>{s.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Referral ─────────────────────────────────────── */}
            <section className="lp-section lp-referral-section">
                <div className="lp-section-head">
                    <span className="lp-label">{t('landing.referral.label')}</span>
                    <h2>{t('landing.referral.title')}</h2>
                    <p>{t('landing.referral.subtitle')}</p>
                </div>
                <div className="lp-referral-grid">
                    {[
                        { num: 1, title: t('landing.referral.step1Title'), desc: t('landing.referral.step1Desc') },
                        { num: 2, title: t('landing.referral.step2Title'), desc: t('landing.referral.step2Desc') },
                        { num: 3, title: t('landing.referral.step3Title'), desc: t('landing.referral.step3Desc') },
                    ].map(({ num, title, desc }) => (
                        <div className="lp-referral-card" key={num}>
                            <div className="lp-referral-num">{num}</div>
                            <h4>{title}</h4>
                            <p>{desc}</p>
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <Link to="/register" className="lp-btn-primary">{t('landing.referral.cta')}</Link>
                </div>
            </section>

            {/* ── Pricing ──────────────────────────────────────── */}
            <section className="lp-section lp-pricing-section">
                <div className="lp-section-head">
                    <span className="lp-label">{t('landing.pricing.label')}</span>
                    <h2>{t('landing.pricing.title')}</h2>
                    <p>{t('landing.pricing.subtitle')}</p>
                </div>
                <div className="lp-pricing-scroll">
                    <div className="lp-pricing-grid">
                        {TIER_ORDER.map((key) => {
                            const tier      = t(`landing.pricing.tiers.${key}`, { returnObjects: true });
                            const price     = TIER_PRICES[key];
                            const disabled  = TIER_DISABLED[key];
                            const isPopular = key === 'silver';
                            const feats     = Array.isArray(tier.features) ? tier.features : [];
                            const color     = TIER_COLORS[key];

                            return (
                                <div className={`lp-price-card${isPopular ? ' popular' : ''}`} key={key} style={{ '--tier-color': color }}>
                                    {isPopular && <div className="lp-popular-tag">{t('landing.pricing.mostPopular')}</div>}
                                    <div className="lp-tier-top">
                                        <span className="lp-tier-badge">{TIER_BADGES[key]}</span>
                                        <span className="lp-tier-name">{tier.name}</span>
                                    </div>
                                    <div className="lp-tier-price">
                                        {price
                                            ? <><strong>${price}</strong><span>{t('landing.pricing.perMonth')}</span></>
                                            : <><strong>Free</strong></>
                                        }
                                    </div>
                                    <p className="lp-tier-sub">{tier.sub}</p>
                                    <div className="lp-divider" />
                                    <ul className="lp-feat-list">
                                        {feats.map((feat, i) => (
                                            <li key={i} className={disabled.includes(i) ? 'off' : ''}>
                                                <span>{disabled.includes(i) ? '✗' : '✓'}</span>
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    {key === 'starter'
                                        ? <Link to="/register" className="lp-tier-btn">{tier.cta}</Link>
                                        : <button className={`lp-tier-btn${isPopular ? ' highlighted' : ''}`} onClick={() => setSelectedPlan({ name: tier.name, color })}>{tier.cta}</button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="lp-footer">
                <Link to="/" className="lp-logo">
                    <img src="/icon.png" alt="Dupla" />
                    DUPLA
                </Link>
                <div className="lp-footer-links">
                    <Link to="/privacy">Privacy Policy</Link>
                    <span>·</span>
                    <Link to="/terms">Terms</Link>
                    <span>·</span>
                    <Link to="/delete-account">Delete Account</Link>
                </div>
                <p className="lp-copyright">{t('landing.footer.copyright')}</p>
            </footer>

            {/* ── Contact Modal ─────────────────────────────────── */}
            {selectedPlan && (
                <div className="lp-modal-overlay" onClick={() => setSelectedPlan(null)}>
                    <div className="lp-modal" onClick={e => e.stopPropagation()}>
                        <button className="lp-modal-close" onClick={() => setSelectedPlan(null)}>✕</button>
                        <div className="lp-modal-badge" style={{ background: selectedPlan.color }}>
                            {t('landing.modal.title')}
                        </div>
                        <h2>{selectedPlan.name}</h2>
                        <p>{t('landing.modal.body')}</p>
                        <a href="https://wa.me/584127854824" target="_blank" rel="noopener noreferrer" className="lp-modal-wa">
                            💬 {t('landing.modal.whatsapp')}
                        </a>
                        <div className="lp-modal-contact">
                            <span>duplatraining@gmail.com</span>
                            <span>+58 412 785 4824</span>
                        </div>
                        <a href={`mailto:duplatraining@gmail.com?subject=Plan ${selectedPlan.name}`} className="lp-modal-email">
                            {t('landing.modal.emailBtn')}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
