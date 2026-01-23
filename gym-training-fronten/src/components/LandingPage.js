import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Smartphone, CheckCircle } from 'lucide-react';
import dashboardPreview from '../assets/dashboard-preview.jpg';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <img src="/icon.png" alt="Dupla Logo" className="logo-img" />
                    <span>DUPLA</span>
                </div>
                <div className="nav-links">
                    <Link to="/login" className="nav-btn-outline">Login</Link>
                </div>
            </nav>




            <header className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        TRAIN <span className="highlight">SMARTER</span><br />
                        NOT HARDER.
                    </h1>
                    <p className="hero-subtitle">
                        The ultimate fitness companion connecting you with professional coaches.
                        Personalized workouts, smart nutrition tracking, and direct feedback from your trainer.
                    </p>
                    <div className="hero-buttons">
                        <button className="cta-button primary">
                            Get the App <Smartphone size={20} style={{ marginLeft: 8 }} />
                        </button>
                        <Link to="/login" className="cta-button secondary">
                            Web Dashboard
                        </Link>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="phone-mockup">
                        <div className="screen-content carousel-container">
                            <div className="carousel-track">
                                <div className="carousel-slide">
                                    <img src={dashboardPreview} alt="Dashboard Preview 1" />
                                </div>
                                {/* Duplicating for carousel effect as requested */}
                                <div className="carousel-slide">
                                    <img src={dashboardPreview} alt="Dashboard Preview 2" style={{ filter: 'hue-rotate(90deg)' }} />
                                </div>
                                <div className="carousel-slide">
                                    <img src={dashboardPreview} alt="Dashboard Preview 3" style={{ filter: 'hue-rotate(180deg)' }} />
                                </div>
                            </div>
                            <div className="carousel-indicators">
                                <span className="indicator active"></span>
                                <span className="indicator"></span>
                                <span className="indicator"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="features-section">
                <div className="feature-card">
                    <div className="icon-wrapper"><Zap color="#00ffff" /></div>
                    <h3>Custom Plans</h3>
                    <p>Workouts tailored specifically to your goals by your coach.</p>
                </div>
                <div className="feature-card">
                    <div className="icon-wrapper"><Shield color="#00ffff" /></div>
                    <h3>Coach Connect</h3>
                    <p>Real certified coaches monitoring your form and progress.</p>
                </div>
                <div className="feature-card">
                    <div className="icon-wrapper"><CheckCircle color="#00ffff" /></div>
                    <h3>Nutrition Tracking</h3>
                    <p>Macro-perfect meal plans integrated with your training.</p>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="footer-links">
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/delete-account">Delete Account</Link>
                </div>
                <p className="copyright">© 2026 Dupla. Powered by Kevin.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
