import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo-gradient">LearnLoop</span>
          <span className="navbar__logo-ai">AI</span>
        </Link>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar__link">Dashboard</Link>
              <div className="navbar__user">
                <span className="navbar__user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="navbar__user-name">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="navbar__btn navbar__btn--outline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__link">Login</Link>
              <Link to="/register" className="navbar__btn navbar__btn--primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
