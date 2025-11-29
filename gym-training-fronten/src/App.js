import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import CoachDashboard from './components/CoachDashboard';
import AdminDashboard from './components/AdminDashboard';
import TraineeDashboard from './components/TraineeDashboard';
import SubscriptionBlocked from './components/SubscriptionBlocked';

function App() {
  // Cache buster: v1.0.1 - Force new build
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // Load user session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const toggleForm = () => {
    setShowRegister(!showRegister);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>💪 Gym Training App</h1>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.name} ({user.role})</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!user ? (
          showRegister ? (
            <Register onRegister={handleLogin} onToggle={toggleForm} />
          ) : (
            <Login onLogin={handleLogin} onToggle={toggleForm} />
          )
        ) : user.role === 'admin' ? (
          <AdminDashboard token={token} userId={user.id} userRole={user.role} />
        ) : user.role === 'coach' ? (
          // Check subscription status and user status for coaches
          (() => {
            console.log('Coach subscription status:', user.subscriptionStatus);
            console.log('User status:', user.status);
            return user.status === 'blocked' || user.subscriptionStatus === 'free' ? (
              <SubscriptionBlocked onLogout={handleLogout} reason={user.status === 'blocked' ? 'blocked' : 'subscription'} />
            ) : (
              <CoachDashboard token={token} userId={user.id} userRole={user.role} onLogout={handleLogout} />
            );
          })()
        ) : user.role === 'trainee' ? (
          // Check user status for trainees
          user.status === 'blocked' ? (
            <SubscriptionBlocked onLogout={handleLogout} reason="blocked" />
          ) : (
            <TraineeDashboard token={token} userId={user.id} />
          )
        ) : (
          <TraineeDashboard token={token} userId={user.id} />
        )}
      </main>
    </div>
  );
}

export default App;
