import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{
          fontSize: '5rem',
          fontWeight: 900,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '1rem',
          letterSpacing: '-0.04em'
        }}>
          404
        </div>
        <h1 className="auth-card__title">Page Not Found</h1>
        <p className="auth-card__subtitle" style={{ marginBottom: '1.75rem' }}>
          The page or lecture segment you are looking for does not exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn btn--primary btn--lg" style={{ display: 'inline-flex' }}>
          <span>← Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
