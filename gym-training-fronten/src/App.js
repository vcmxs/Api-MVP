

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';

// Components
import LandingPage from './components/LandingPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import DeleteAccount from './components/DeleteAccount';
import Login from './components/Login';
import Register from './components/Register';
import CoachDashboard from './components/CoachDashboard';
import AdminDashboard from './components/AdminDashboard';
import TraineeDashboard from './components/TraineeDashboard';
import SubscriptionBlocked from './components/SubscriptionBlocked';

// Dashboard Container Component handling the session logic
const DashboardContainer = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    } else {
      // If no session, redirect to login
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return null; // Will redirect

  // Dashboard Logic
  return (
    <div className="dashboard-wrapper">
      <header className="app-header">
        <h1>DUPLA Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.name} ({user.role})</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <main className="app-main">
        {user.role === 'admin' ? (
          <AdminDashboard token={token} userId={user.id} userRole={user.role} />
        ) : user.role === 'coach' ? (
          user.status === 'blocked' || user.subscriptionStatus === 'free' ? (
            <SubscriptionBlocked onLogout={handleLogout} reason={user.status === 'blocked' ? 'blocked' : 'subscription'} />
          ) : (
            <CoachDashboard token={token} userId={user.id} userRole={user.role} onLogout={handleLogout} />
          )
        ) : (
          user.status === 'blocked' ? (
            <SubscriptionBlocked onLogout={handleLogout} reason="blocked" />
          ) : (
            // Debug Expiration Logic
            (() => {
              const isActive = user.coachSubscriptionStatus === 'active';
              const endDate = user.coachSubscriptionEndDate ? new Date(user.coachSubscriptionEndDate) : null;
              const now = new Date();
              const isDateValid = endDate && endDate > now;
              const shouldBeExpired = !(isActive && isDateValid);

              console.log('DEBUG: Access Check', {
                status: user.coachSubscriptionStatus,
                endDateStr: user.coachSubscriptionEndDate,
                endDateObj: endDate,
                now: now,
                isActive,
                isDateValid,
                shouldBeExpired
              });

              return (
                <TraineeDashboard
                  token={token}
                  userId={user.id}
                  isExpired={shouldBeExpired}
                />
              );
            })()
          )
        )}
      </main>
    </div>
  );
};

// Login Wrapper to handle success redirect
const LoginWrapper = () => {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);

  const handleLoginSuccess = (userData, userToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    navigate('/dashboard');
  };

  return (
    <div className="auth-wrapper">
      {showRegister ? (
        <Register onRegister={handleLoginSuccess} onToggle={() => setShowRegister(false)} />
      ) : (
        <Login onLogin={handleLoginSuccess} onToggle={() => setShowRegister(true)} />
      )}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/dashboard" element={<DashboardContainer />} />
            {/* Catch all - redirect home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;