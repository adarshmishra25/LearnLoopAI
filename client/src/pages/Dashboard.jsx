import { useState, useEffect, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, completed, processing, failed

  const fetchLectures = async () => {
    try {
      const res = await getLectures();
      setLectures(res.data.lectures || []);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
    // Poll for status updates every 8s
    const interval = setInterval(fetchLectures, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAddLecture = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await createLecture({ videoUrl });
      setSuccessMsg(`"${res.data.lecture.title || 'New Lecture'}" is being processed...`);
      setVideoUrl('');
      setShowModal(false);
      fetchLectures();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process lecture');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title || 'this lecture'}" and all its chunk data?`)) return;
    try {
      await deleteLecture(id);
      fetchLectures();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSampleClick = (url) => {
    setVideoUrl(url);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = lectures.length;
    const completed = lectures.filter(l => l.status === 'completed').length;
    const scores = lectures.filter(l => l.latestScore !== null && l.latestScore !== undefined).map(l => l.latestScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { total, completed, avgScore };
  }, [lectures]);

  // Filtered lectures
  const filteredLectures = useMemo(() => {
    return lectures.filter(l => {
      const matchesSearch = l.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'completed' ? l.status === 'completed' :
        filterStatus === 'processing' ? (l.status === 'processing' || l.status === 'pending') :
        filterStatus === 'failed' ? l.status === 'failed' : true;
      return matchesSearch && matchesFilter;
    });
  }, [lectures, searchTerm, filterStatus]);

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', cls: 'badge--pending' },
      processing: { label: 'Analyzing with AI...', cls: 'badge--processing' },
      completed: { label: 'Ready', cls: 'badge--success' },
      failed: { label: 'Failed', cls: 'badge--error' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`badge ${s.cls}`}>
        <span className="badge__dot"></span>
        {s.label}
      </span>
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            Welcome back, <span className="text-gradient">{user?.name || 'Learner'}</span>
          </h1>
          <p className="dashboard__subtitle">Track your progress and master new video lectures</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <span>✨</span>
          <span>Add New Lecture</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-card__icon">📚</div>
          <div>
            <div className="stat-card__val">{stats.total}</div>
            <div className="stat-card__lbl">Lectures Enrolled</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">⚡</div>
          <div>
            <div className="stat-card__val">{stats.completed}</div>
            <div className="stat-card__lbl">Ready to Learn</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">🎯</div>
          <div>
            <div className="stat-card__val">{stats.avgScore !== null ? `${stats.avgScore}%` : 'N/A'}</div>
            <div className="stat-card__lbl">Avg Quiz Mastery</div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert--success">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert--error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Add Lecture Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title-group">
                <h2 className="modal__title">Add YouTube Lecture</h2>
                <span className="modal__subtitle">AI extracts transcript, chunks topics & builds quizzes</span>
              </div>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddLecture} className="modal__body">
              <div className="form-group">
                <label htmlFor="videoUrl" className="form-label">
                  <span>YouTube Video URL</span>
                </label>
                <div className="form-input-wrapper">
                  <input
                    id="videoUrl"
                    type="url"
                    className="form-input"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    autoFocus
                  />
                </div>
                <p className="form-hint">Make sure the video has public captions or subtitles enabled</p>

                {/* Sample quick buttons */}
                <div className="sample-links-bar">
                  <span className="sample-links-label">Quick sample lectures to try:</span>
                  <div className="sample-links-list">
                    <button 
                      type="button" 
                      className="sample-link-chip"
                      onClick={() => handleSampleClick('https://www.youtube.com/watch?v=aircAruvnKk')}
                    >
                      3Blue1Brown Neural Networks
                    </button>
                    <button 
                      type="button" 
                      className="sample-link-chip"
                      onClick={() => handleSampleClick('https://www.youtube.com/watch?v=tpIctyqH29Q')}
                    >
                      CrashCourse CS: Algorithms
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert--error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="btn-spinner"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Process Lecture ✨</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controls: Search and Filter */}
      {lectures.length > 0 && (
        <div className="dashboard-controls">
          <div className="search-box">
            <span className="search-box__icon">🔍</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Search lectures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            <button
              className={`filter-pill ${filterStatus === 'all' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({lectures.length})
            </button>
            <button
              className={`filter-pill ${filterStatus === 'completed' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Ready ({lectures.filter(l => l.status === 'completed').length})
            </button>
            <button
              className={`filter-pill ${filterStatus === 'processing' ? 'filter-pill--active' : ''}`}
              onClick={() => setFilterStatus('processing')}
            >
              Processing ({lectures.filter(l => l.status === 'processing' || l.status === 'pending').length})
            </button>
          </div>
        </div>
      )}

      {/* Lectures Grid */}
      {loading ? (
        <div className="page-loader">
          <div className="loader-spinner"></div>
          <p>Syncing your lectures...</p>
        </div>
      ) : lectures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-wrap">📚</div>
          <h2 className="empty-state__title">No Lectures Yet</h2>
          <p className="empty-state__text">
            Add any YouTube lecture to convert it into segmented chunks, flashcards, and quizzes.
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => setShowModal(true)}>
            <span>✨</span>
            <span>Add Your First Lecture</span>
          </button>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-wrap">🔍</div>
          <h2 className="empty-state__title">No Matching Lectures</h2>
          <p className="empty-state__text">
            Try adjusting your search query or status filter.
          </p>
          <button className="btn btn--ghost" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="lectures-grid">
          {filteredLectures.map((lecture) => {
            const ytId = extractYTId(lecture.videoUrl);
            return (
              <div key={lecture._id} className="lecture-card">
                <div className="lecture-card__header">
                  <div className="lecture-card__thumb">
                    <img 
                      src={ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : 'https://placehold.co/480x270/1a1a2e/ffffff?text=Video'}
                      alt={lecture.title}
                      className="lecture-card__thumb-img"
                      loading="lazy"
                    />
                    <div className="lecture-card__play-overlay">
                      <div className="lecture-card__play-btn">▶</div>
                    </div>
                    {lecture.duration > 0 && (
                      <span className="lecture-card__duration-tag">
                        {formatDuration(lecture.duration)}
                      </span>
                    )}
                  </div>
                  <div className="lecture-card__status">
                    {getStatusBadge(lecture.status)}
                  </div>
                </div>

                <div className="lecture-card__body">
                  <h3 className="lecture-card__title" title={lecture.title}>
                    {lecture.title || 'Untitled Lecture'}
                  </h3>
                  
                  <div className="lecture-card__meta">
                    <div className="lecture-card__meta-item">
                      <span>📑</span>
                      <span>{lecture.totalChunks || 0} Sections</span>
                    </div>
                    <div className="lecture-card__meta-item">
                      <span>⏱️</span>
                      <span>{formatDuration(lecture.duration)}</span>
                    </div>
                  </div>

                  {lecture.status === 'completed' && (
                    <div className="progress-section">
                      <div className="progress-header">
                        <span className="progress-label">Course Progress</span>
                        <span className="progress-pct">{lecture.progress || 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-bar__fill" 
                          style={{ width: `${Math.max(lecture.progress || 0, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {lecture.latestScore !== null && lecture.latestScore !== undefined && (
                    <div className="lecture-card__score-badge">
                      <span>🏆</span>
                      <span>Quiz Score: <strong>{lecture.latestScore}%</strong></span>
                    </div>
                  )}
                </div>

                <div className="lecture-card__actions">
                  {lecture.status === 'completed' ? (
                    <Link to={`/lecture/${lecture._id}`} className="btn btn--primary btn--sm btn--full">
                      <span>Continue Learning</span>
                      <span>→</span>
                    </Link>
                  ) : lecture.status === 'processing' ? (
                    <button className="btn btn--ghost btn--sm btn--full" disabled>
                      <span className="btn-spinner"></span>
                      <span>AI Processing...</span>
                    </button>
                  ) : lecture.status === 'failed' ? (
                    <button className="btn btn--error btn--sm btn--full" onClick={() => handleDelete(lecture._id, lecture.title)}>
                      <span>Delete & Retry</span>
                    </button>
                  ) : (
                    <button className="btn btn--ghost btn--sm btn--full" disabled>
                      <span>Queued...</span>
                    </button>
                  )}

                  {lecture.status !== 'processing' && (
                    <button 
                      className="btn btn--ghost btn--sm" 
                      onClick={() => handleDelete(lecture._id, lecture.title)}
                      title="Delete lecture"
                      style={{ padding: '0.45rem 0.65rem' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper to extract video ID for thumbnail
const extractYTId = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
};

export default Dashboard;
