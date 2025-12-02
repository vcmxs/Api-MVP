import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

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
        <h2>Login</h2>

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
          <div className="app-info-box" style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '400px',
            flex: '1',
            minWidth: '300px',
            textAlign: 'center',
            color: 'var(--gray)'
          }}>
            <h3 style={{ color: 'var(--light)', marginBottom: '0.5rem' }}>Welcome to Dupla! 🚀</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              Bienvenido a Dupla, tu compañero ideal para rastrear tus entrenamientos y lograr tus metas de fitness.
              Los entrenadores pueden gestionar a los alumnos, y los alumnos pueden rastrear su progreso con facilidad.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
            </p>
          </div>

          <div className="app-info-box" style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '400px',
            flex: '1',
            minWidth: '300px',
            textAlign: 'center',
            color: 'var(--gray)'
          }}>
            <h3 style={{ color: 'var(--light)', marginBottom: '0.5rem' }}>Detalles de actualización:</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              Puede que al iniciar sesión por primera vez, tarde un poco en cargar los datos.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              Esto se debe a que el servidor entra en suspension luego de un tiempo sin actividad, tardara 30 segundos en iniciar.   </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;