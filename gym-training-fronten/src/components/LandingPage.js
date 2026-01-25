import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Smartphone, CheckCircle } from 'lucide-react';
import dashboardPreview from '../assets/dashboard-preview.jpg';
import './LandingPage.css';

const LandingPage = () => {
    const [selectedPlan, setSelectedPlan] = useState(null);

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

            <section className="pricing-section">
                <h2 className="section-title">Choose Your Plan</h2>
                <div className="pricing-grid">
                    <div className="pricing-card starter">
                        <div className="card-header">
                            <h3>Starter</h3>
                            <div className="price">Free</div>
                        </div>
                        <ul className="card-features">
                            <li>1 Trainee Limit</li>
                            <li>Basic Tracking</li>
                            <li className="disabled">Advanced Stats</li>
                        </ul>
                        <Link to="/register" className="pricing-btn">Start Free</Link>
                    </div>

                    <div className="pricing-card bronze">
                        <div className="card-header">
                            <h3>Bronze</h3>
                            <div className="price">$15<span>/mo</span></div>
                        </div>
                        <ul className="card-features">
                            <li>Up to 4 Trainees</li>
                            <li>Advanced Stats</li>
                            <li>Small Group Support</li>
                        </ul>
                        <button onClick={() => setSelectedPlan({ name: 'Bronze', color: '#cd7f32' })} className="pricing-btn">Get Started</button>
                    </div>

                    <div className="pricing-card silver popular">
                        <div className="popular-tag">MOST POPULAR</div>
                        <div className="card-header">
                            <h3>Silver</h3>
                            <div className="price">$30<span>/mo</span></div>
                        </div>
                        <ul className="card-features">
                            <li>Up to 10 Trainees</li>
                            <li>Priority Support</li>
                            <li>Full Analytics</li>
                        </ul>
                        <button onClick={() => setSelectedPlan({ name: 'Silver', color: '#00ffff' })} className="pricing-btn primary">Go Silver</button>
                    </div>

                    <div className="pricing-card gold">
                        <div className="card-header">
                            <h3>Gold</h3>
                            <div className="price">$80<span>/mo</span></div>
                        </div>
                        <ul className="card-features">
                            <li>Up to 25 Trainees</li>
                            <li>All Features Unlocked</li>
                            <li>24/7 Support</li>
                        </ul>
                        <button onClick={() => setSelectedPlan({ name: 'Gold', color: '#ffd700' })} className="pricing-btn">Get Gold</button>
                    </div>

                    <div className="pricing-card olympian">
                        <div className="card-header">
                            <h3>Olympian</h3>
                            <div className="price">$100<span>/mo</span></div>
                        </div>
                        <ul className="card-features">
                            <li>Unlimited Trainees</li>
                            <li>VIP Access</li>
                            <li>Enterprise Tools</li>
                        </ul>
                        <button onClick={() => setSelectedPlan({ name: 'Olympian', color: '#85a9f7' })} className="pricing-btn">Contact Sales</button>
                    </div>
                </div>
            </section>

            {/* Payment / Contact Modal */}
            {selectedPlan && (
                <div className="modal-overlay" onClick={() => setSelectedPlan(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderColor: selectedPlan.color }}>
                        <button className="close-modal" onClick={() => setSelectedPlan(null)}>×</button>
                        <h2 style={{ color: selectedPlan.name === 'Starter' ? '#fff' : selectedPlan.color }}>
                            Upgrade to {selectedPlan.name}
                        </h2>

                        <div className="modal-body">
                            <p className="modal-text">To process your payment and activate this plan, please contact our sales team.</p>

                        </div>

                        {/* WhatsApp Support Link */}
                        <a
                            href="https://wa.me/584127854824"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                backgroundColor: '#25D366',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                marginBottom: '20px',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Contact Support via WhatsApp 💬
                        </a>

                        <div className="contact-box">
                            <div className="email">support@dupla.fit</div>
                            <div className="ref">Reference Plan: <strong>{selectedPlan.name}</strong></div>
                        </div>

                        <div className="modal-actions">
                            <Link to="/register" className="cta-button secondary">Create Free Account First</Link>
                            <a href={`mailto:support@dupla.fit?subject=Upgrade to ${selectedPlan.name} Plan`} className="cta-button primary">
                                Send Request
                            </a>
                        </div>
                    </div>
                </div>
            )}



            <footer className="landing-footer">
                <div className="footer-links">
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/delete-account">Delete Account</Link>
                </div>
                <p className="copyright">© 2026 Dupla. Powered by Kevin.</p>
            </footer>
        </div >
    );
};

export default LandingPage;
