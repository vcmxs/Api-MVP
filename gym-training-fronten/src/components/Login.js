import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

function Login({ onLogin, onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo matching mobile app */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/icon.png"
            alt="Dupla Logo"
            style={{
              width: '100px',
              height: '100px',
              marginBottom: '1rem'
            }}
          />
          <h2 style={{
            color: 'var(--primary)',
            fontSize: '2rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom: '0.5rem'
          }}>DUPLA</h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '1rem',
            margin: 0
          }}>Welcome back</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer' }}>Remember me</label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>Don't have an account?</p>
          <button onClick={onToggle} className="btn-link">
            Register here
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <div className="info-box" style={{
            padding: '1.5rem',
            background: 'rgba(0, 255, 255, 0.05)',
            borderRadius: '15px',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            maxWidth: '350px',
            flex: '1',
            minWidth: '280px'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>Welcome to Dupla!</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              Tu compañero ideal para rastrear tus entrenamientos y lograr tus metas de fitness.
            </p>
          </div>

          <div className="info-box" style={{
            padding: '1.5rem',
            background: 'rgba(0, 255, 255, 0.05)',
            borderRadius: '15px',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            maxWidth: '350px',
            flex: '1',
            minWidth: '280px'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>Loading Note</h3>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              El servidor puede tardar ~30 segundos en iniciar después de inactividad. Gracias por tu paciencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;