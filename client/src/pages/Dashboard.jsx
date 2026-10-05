import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLectures, createLecture, deleteLecture } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLectures = async () => {
    try {
      const res = await getLectures();
      setLectures(res.data.lectures);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
    // Poll for status updates every 10s
    const interval = setInterval(fetchLectures, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddLecture = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await createLecture({ videoUrl });
      setSuccessMsg(`"${res.data.lecture.title}" is being processed...`);
      setVideoUrl('');
      setShowModal(false);
      fetchLectures();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process lecture');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lecture and all its data?')) return;
    try {
      await deleteLecture(id);
      fetchLectures();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', cls: 'badge--pending' },
      processing: { label: 'Processing...', cls: 'badge--processing' },
      completed: { label: 'Ready', cls: 'badge--success' },
      failed: { label: 'Failed', cls: 'badge--error' },
    };
    const s = map[status] || map.pending;
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            Welcome, <span className="text-gradient">{user?.name}</span>
          </h1>
          <p className="dashboard__subtitle">Your learning dashboard</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + Add New Lecture
        </button>
      </div>

      {successMsg && <div className="alert alert--success">{successMsg}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      {/* Add Lecture Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add New Lecture</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddLecture} className="modal__body">
              <div className="form-group">
                <label htmlFor="videoUrl" className="form-label">YouTube Video URL</label>
                <input
                  id="videoUrl"
                  type="url"
                  className="form-input"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
                <p className="form-hint">Paste a YouTube lecture URL with captions/subtitles enabled</p>
              </div>
              {error && <div className="alert alert--error">{error}</div>}
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? <span className="btn-spinner"></span> : 'Process Lecture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lectures Grid */}
      {loading ? (
        <div className="page-loader">
          <div className="loader-spinner"></div>
          <p>Loading your lectures...</p>
        </div>
      ) : lectures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📚</div>
          <h2 className="empty-state__title">No lectures yet</h2>
          <p className="empty-state__text">Add your first YouTube lecture to start learning</p>
          <button className="btn btn--primary" onClick={() => setShowModal(true)}>
            + Add Your First Lecture
          </button>
        </div>
      ) : (
        <div className="lectures-grid">
          {lectures.map((lecture) => (
            <div key={lecture._id} className="lecture-card">
              <div className="lecture-card__header">
                <div className="lecture-card__thumb">
                  <img 
                    src={`https://img.youtube.com/vi/${extractYTId(lecture.videoUrl)}/mqdefault.jpg`}
                    alt={lecture.title}
                    className="lecture-card__thumb-img"
                  />
                </div>
                <div className="lecture-card__status">
                  {getStatusBadge(lecture.status)}
                </div>
              </div>

              <div className="lecture-card__body">
                <h3 className="lecture-card__title">{lecture.title || 'Untitled Lecture'}</h3>
                
                <div className="lecture-card__meta">
                  <span>📊 {lecture.totalChunks} chunks</span>
                  <span>⏱ {formatDuration(lecture.duration)}</span>
                </div>

                {lecture.status === 'completed' && lecture.totalChunks > 0 && (
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar__fill" 
                        style={{ width: `${lecture.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-label">{lecture.progress}% complete</span>
                  </div>
                )}

                {lecture.latestScore !== null && lecture.latestScore !== undefined && (
                  <div className="lecture-card__score">
                    Latest quiz: <strong>{lecture.latestScore}%</strong>
                  </div>
                )}
              </div>

              <div className="lecture-card__actions">
                {lecture.status === 'completed' ? (
                  <Link to={`/lecture/${lecture._id}`} className="btn btn--primary btn--sm btn--full">
                    Continue Learning
                  </Link>
                ) : lecture.status === 'processing' ? (
                  <button className="btn btn--ghost btn--sm btn--full" disabled>
                    <span className="btn-spinner"></span> Processing...
                  </button>
                ) : lecture.status === 'failed' ? (
                  <button className="btn btn--error btn--sm btn--full" onClick={() => handleDelete(lecture._id)}>
                    Delete & Retry
                  </button>
                ) : (
                  <button className="btn btn--ghost btn--sm btn--full" disabled>
                    Waiting...
                  </button>
                )}
                {lecture.status !== 'processing' && (
                  <button 
                    className="btn btn--ghost btn--sm" 
                    onClick={() => handleDelete(lecture._id)}
                    title="Delete lecture"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to extract video ID for thumbnail
const extractYTId = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
};

export default Dashboard;
