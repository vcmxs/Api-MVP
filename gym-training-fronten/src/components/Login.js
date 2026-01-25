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
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)', // Premium dark gradient
      padding: '20px'
    }}>
      <div className="login-card" style={{
        background: 'rgba(255, 255, 255, 0.03)', // Glass effect
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '420px', // Compact width
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}>
        {/* Logo Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)'
          }}>
            <img src="/icon.png" alt="Dupla" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
          </div>
          <h2 style={{
            color: '#fff',
            fontSize: '1.8rem',
            fontWeight: '800',
            letterSpacing: '4px',
            margin: '0 0 0.5rem',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>DUPLA</h2>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: 0, fontWeight: '500' }}>WELCOME BACK</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email Address"
                style={{
                  width: '100%',
                  padding: '1rem 1.2rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ffff';
                  e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '1rem 1.2rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ffff';
                  e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                }}
              />
            </div>
          </div>

          <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                accentColor: '#00ffff',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label htmlFor="rememberMe" style={{ color: '#aaa', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>Remember me</label>
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              color: '#ff4444',
              padding: '0.8rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(90deg, #00ffff 0%, #0080ff 100%)',
            color: '#000',
            fontWeight: 'bold',
            padding: '1rem',
            borderRadius: '12px',
            border: 'none',
            fontSize: '1.1rem',
            cursor: loading ? 'wait' : 'pointer',
            marginTop: '0.5rem',
            transition: 'transform 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 4px 15px rgba(0, 255, 255, 0.3)'
          }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
          >
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>

        <div className="auth-toggle" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Don't have an account?</p>
          <button onClick={onToggle} style={{
            background: 'none',
            border: 'none',
            color: '#00ffff',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0
          }}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;