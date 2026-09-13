import { useState, useEffect } from 'react';
import { checkHealth } from './services/api';
import './index.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('loading');
  const [dbStatus, setDbStatus] = useState('loading');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await checkHealth();
        if (response.data.success) {
          setBackendStatus('connected');
          setDbStatus('connected');
        }
      } catch (error) {
        console.error('Health check failed:', error.message);
        setBackendStatus('error');
        setDbStatus('error');
      }
    };

    fetchHealth();
  }, []);

  const getStatusText = (status) => {
    if (status === 'loading') return 'Checking...';
    if (status === 'connected') return 'Connected';
    return 'Disconnected';
  };

  const getStatusClass = (status) => {
    if (status === 'loading') return 'loading';
    if (status === 'connected') return 'success';
    return 'error';
  };

  return (
    <div className="app">
      <div className="hero">
        <div className="hero__badge">
          <span className="hero__badge-dot"></span>
          Day 1 Foundation
        </div>

        <h1 className="hero__title">
          <span className="hero__title-gradient">LearnLoop</span> AI
        </h1>

        <p className="hero__subtitle">
          AI-powered lecture learning platform
        </p>

        <div className="status-card">
          <div className="status-card__header">
            <span className="status-card__icon">⚡</span>
            <span className="status-card__label">System Status</span>
          </div>

          <div className="status-card__items">
            <div className="status-item">
              <span className="status-item__label">Backend</span>
              <span className={`status-item__value status-item__value--${getStatusClass(backendStatus)}`}>
                {backendStatus === 'loading' ? (
                  <span className="spinner"></span>
                ) : (
                  <span className={`status-item__dot status-item__dot--${getStatusClass(backendStatus)}`}></span>
                )}
                {getStatusText(backendStatus)}
              </span>
            </div>

            <div className="status-item">
              <span className="status-item__label">Database</span>
              <span className={`status-item__value status-item__value--${getStatusClass(dbStatus)}`}>
                {dbStatus === 'loading' ? (
                  <span className="spinner"></span>
                ) : (
                  <span className={`status-item__dot status-item__dot--${getStatusClass(dbStatus)}`}></span>
                )}
                {getStatusText(dbStatus)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="footer-tag">MERN Stack · Day 1</p>
    </div>
  );
}

export default App;
