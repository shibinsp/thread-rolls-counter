import { useState, useEffect } from 'react';
import './index.css';
import { api, setToken, getToken } from './services/api';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import UserPage from './components/UserPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getToken();
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        await api.getMe();
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
        setShowLanding(false); // Skip landing if already authenticated
      } catch {
        handleLogout();
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading...</p>
      </div>
    );
  }

  // Show landing page if not authenticated and showLanding is true
  if (!user && !isAuthenticated && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // Show login page if not authenticated
  if (!user || !isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show appropriate dashboard based on role
  if (user.role === 'admin') {
    return <AdminPage user={user} onLogout={handleLogout} />;
  }

  return <UserPage user={user} onLogout={handleLogout} />;
}

export default App;
