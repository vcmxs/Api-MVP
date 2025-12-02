import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
function Login({ onLogin, onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // Add this
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Add this useEffect
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);
}



function Login({ onLogin, onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      // Add this block
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {/* Add this checkbox group */ }
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

      { error && <div className="error-message">{error}</div> }

      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  {/*
    const quickLogin = (role) => {
      if (role === 'coach') {
        setEmail('coach@gym.com');
        setPassword('coach123');
      } else {
        setEmail('john@gym.com');
        setPassword('john123');
      }
    };
  */}

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>


        {/* <div className="quick-login">
          <p>Quick login as:</p>
          <button onClick={() => quickLogin('coach')} className="btn-secondary">
            Coach
          </button>
          <button onClick={() => quickLogin('trainee')} className="btn-secondary">
            Trainee
          </button>
        </div> */}

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
      </div>
    </div>
  );
}

export default Login;