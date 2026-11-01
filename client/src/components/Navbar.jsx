import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <div className="navbar__brand-logo">⚡</div>
          <span className="navbar__logo-gradient">LearnLoop</span>
          <span className="navbar__logo-ai">AI</span>
        </Link>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className={`navbar__link ${location.pathname === '/dashboard' ? 'navbar__link--active' : ''}`}
              >
                Dashboard
              </Link>
              <div className="navbar__user">
                <span className="navbar__user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="navbar__user-name">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="navbar__btn navbar__btn--outline" title="Sign Out">
                <span>Sign Out</span>
                <span style={{ fontSize: '0.85rem' }}>↗</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__link">Login</Link>
              <Link to="/register" className="navbar__btn navbar__btn--primary">
                <span>Get Started</span>
                <span>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
