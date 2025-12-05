import { useState } from 'react';
import { api } from '../services/api';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">🧵</div>
          <h1>Thread Roll Counter</h1>
          <p>AI-powered thread detection and inventory management system</p>
        </div>
        
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon">📷</div>
            <span>Capture or upload thread rack images</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">🤖</div>
            <span>AI-powered automatic counting</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">🎨</div>
            <span>Color detection & breakdown</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">📊</div>
            <span>Track inventory over time</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>
          
          <div className="login-card-body">
            {error && (
              <div className="login-error">
                <span>⚠️</span>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                  />
                  <span className="form-input-icon">👤</span>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrapper">
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <span className="form-input-icon">🔒</span>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary btn-lg btn-block"
                disabled={loading}
                style={{ marginTop: 'var(--space-6)' }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                    Signing in...
                  </>
                ) : (
                  <>Sign In →</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
