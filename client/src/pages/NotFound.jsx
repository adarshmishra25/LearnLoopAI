import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</div>
        <h1 className="auth-card__title">Page Not Found</h1>
        <p className="auth-card__subtitle">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn btn--primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
