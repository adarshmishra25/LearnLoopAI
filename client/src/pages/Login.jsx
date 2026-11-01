import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('learner@example.com');
    setPassword('learnloop123');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__badge">
          <span>✨</span> Intelligent Active Learning
        </div>

        <div className="auth-card__header">
          <h1 className="auth-card__title">Welcome Back</h1>
          <p className="auth-card__subtitle">Sign in to your account to continue your learning journey</p>
        </div>

        {/* Demo Helper Button */}
        <div className="auth-card__demo-helper">
          <span>Need a quick test login?</span>
          <button 
            type="button" 
            className="sample-link-chip" 
            onClick={handleDemoFill}
            style={{ fontWeight: 600 }}
          >
            Fill Demo Info
          </button>
        </div>

        {error && (
          <div className="alert alert--error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <span>Email Address</span>
            </label>
            <div className="form-input-wrapper">
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span>Password</span>
            </label>
            <div className="form-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="form-input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : 'Sign In →'}
          </button>
        </form>

        <p className="auth-card__footer">
          Don't have an account yet? <Link to="/register" className="auth-link">Create one now</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
