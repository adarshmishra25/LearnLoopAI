import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLecture, getChunkQuiz, submitQuiz as submitQuizAPI, reprocessLecture } from '../services/api.js';

const LecturePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('material'); // 'material', 'flashcards', 'quiz'

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Flashcard state
  const [flippedCards, setFlippedCards] = useState(new Set());

  const fetchLecture = async () => {
    try {
      const res = await getLecture(id);
      setLecture(res.data.lecture);
      setChunks(res.data.chunks || []);
      
      // Auto-select first unlocked chunk if none selected
      if (!selectedChunk) {
        const firstUnlocked = res.data.chunks.find(c => c.isUnlocked);
        if (firstUnlocked) setSelectedChunk(firstUnlocked);
      } else {
        // Refresh the selected chunk data
        const updated = res.data.chunks.find(c => c._id === selectedChunk._id);
        if (updated) setSelectedChunk(updated);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lecture details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLecture();
  }, [id]);

  const handleChunkSelect = (chunk) => {
    if (!chunk.isUnlocked) return;
    setSelectedChunk(chunk);
    setActiveTab('material');
    setQuizResult(null);
    setFlippedCards(new Set());
  };

  const handleStartQuiz = async () => {
    if (!selectedChunk) return;
    setQuizLoading(true);
    setQuizResult(null);
    setUserAnswers({});
    setError('');

    try {
      const res = await getChunkQuiz(selectedChunk._id);
      setQuizQuestions(res.data.questions || []);
      setActiveTab('quiz');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    const answers = Object.entries(userAnswers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

    if (answers.length < quizQuestions.length) {
      setError('Please answer all quiz questions before submitting');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setSubmittingQuiz(true);

    try {
      const res = await submitQuizAPI(selectedChunk._id, answers);
      setQuizResult(res.data);
      
      // Refresh lecture data to update unlock states
      await fetchLecture();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetryQuiz = () => {
    setQuizResult(null);
    setUserAnswers({});
    handleStartQuiz();
  };

  const handleReprocess = async () => {
    if (!window.confirm('Regenerate learning materials with Gemini AI? This will re-analyze the lecture and generate fresh summaries, concepts, and quizzes.')) return;
    setReprocessing(true);
    setError('');

    try {
      await reprocessLecture(id);
      // Poll every 3 seconds until completed
      const checkInterval = setInterval(async () => {
        try {
          const res = await getLecture(id);
          setLecture(res.data.lecture);
          if (res.data.lecture.status === 'completed') {
            clearInterval(checkInterval);
            setChunks(res.data.chunks || []);
            const firstUnlocked = res.data.chunks.find(c => c.isUnlocked);
            if (firstUnlocked) setSelectedChunk(firstUnlocked);
            setReprocessing(false);
          } else if (res.data.lecture.status === 'failed') {
            clearInterval(checkInterval);
            setReprocessing(false);
            setError('Processing failed. Please check server logs and GEMINI_API_KEY.');
          }
        } catch {
          clearInterval(checkInterval);
          setReprocessing(false);
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start reprocessing');
      setReprocessing(false);
    }
  };

  const toggleFlashcard = (index) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return '';
    const videoId = match[1];
    const startTime = selectedChunk ? Math.floor(selectedChunk.startTime || 0) : 0;
    return `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=0`;
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner"></div>
        <p>Loading course interactive materials...</p>
      </div>
    );
  }

  if (error && !lecture) {
    return (
      <div className="error-page">
        <h2>Lecture Unavailable</h2>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="lecture-page">
      {/* Header Bar */}
      <div className="lecture-page__header">
        <div className="lecture-page__header-left">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/dashboard')}>
            <span>←</span>
            <span>Dashboard</span>
          </button>
          <div className="lecture-page__info">
            <h1 className="lecture-page__title">{lecture?.title || 'Lecture Session'}</h1>
            <div className="lecture-page__progress-wrap">
              <div className="progress-bar progress-bar--sm">
                <div 
                  className="progress-bar__fill" 
                  style={{ width: `${Math.max(lecture?.progress || 0, 5)}%` }}
                ></div>
              </div>
              <span className="progress-label">{lecture?.progress || 0}% Mastered</span>
            </div>
          </div>
        </div>

        <button
          className="btn btn--secondary btn--sm"
          onClick={handleReprocess}
          disabled={reprocessing || lecture?.status === 'processing'}
          title="Regenerate all chunks, summaries, and quizzes using Gemini AI"
        >
          {reprocessing || lecture?.status === 'processing' ? (
            <>
              <span className="btn-spinner"></span>
              <span>Regenerating with Gemini AI...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Regenerate AI Content</span>
            </>
          )}
        </button>
      </div>

      <div className="lecture-page__content">
        {/* Left: Video Player & Learning Section */}
        <div className="lecture-page__main">
          {/* YouTube Video Container */}
          <div className="video-container">
            <iframe
              src={getVideoEmbedUrl(lecture?.videoUrl)}
              title={lecture?.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="video-iframe"
            ></iframe>
          </div>

          {/* Tab Navigation for Current Chunk */}
          {selectedChunk && !quizResult && (
            <div className="learning-tabs">
              <button
                className={`learning-tab ${activeTab === 'material' ? 'learning-tab--active' : ''}`}
                onClick={() => setActiveTab('material')}
              >
                <span>📝</span>
                <span>Core Material</span>
              </button>
              {selectedChunk.flashcards && selectedChunk.flashcards.length > 0 && (
                <button
                  className={`learning-tab ${activeTab === 'flashcards' ? 'learning-tab--active' : ''}`}
                  onClick={() => setActiveTab('flashcards')}
                >
                  <span>🃏</span>
                  <span>Flashcards ({selectedChunk.flashcards.length})</span>
                </button>
              )}
              {selectedChunk.hasQuiz && (
                <button
                  className={`learning-tab ${activeTab === 'quiz' ? 'learning-tab--active' : ''}`}
                  onClick={handleStartQuiz}
                >
                  <span>🎯</span>
                  <span>Quiz Challenge</span>
                </button>
              )}
            </div>
          )}

          {/* Tab 1: Core Material */}
          {selectedChunk && activeTab === 'material' && !quizResult && (
            <div className="learning-material">
              <div className="learning-material__header">
                <span className="badge badge--success" style={{ marginBottom: '0.5rem' }}>
                  <span className="badge__dot"></span>
                  Section {selectedChunk.chunkNumber}
                </span>
                <h2 className="learning-material__title">{selectedChunk.title}</h2>
              </div>

              {/* Summary */}
              <section className="material-section">
                <h3 className="material-section__heading">
                  <span>📝</span> Section Summary
                </h3>
                <p className="material-section__text">{selectedChunk.summary}</p>
              </section>

              {/* Key Concepts */}
              {selectedChunk.keyConcepts && selectedChunk.keyConcepts.length > 0 && (
                <section className="material-section">
                  <h3 className="material-section__heading">
                    <span>💡</span> Key Concepts & Terminology
                  </h3>
                  <div className="concepts-grid">
                    {selectedChunk.keyConcepts.map((concept, i) => (
                      <div key={i} className="concept-tag">{concept}</div>
                    ))}
                  </div>
                </section>
              )}

              {/* Key Takeaways */}
              {selectedChunk.keyTakeaways && selectedChunk.keyTakeaways.length > 0 && (
                <section className="material-section">
                  <h3 className="material-section__heading">
                    <span>🎯</span> Core Takeaways
                  </h3>
                  <ul className="takeaways-list">
                    {selectedChunk.keyTakeaways.map((t, i) => (
                      <li key={i} className="takeaway-item">{t}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Quick CTA to test understanding */}
              {selectedChunk.hasQuiz && (
                <div className="quiz-cta">
                  <button 
                    className="btn btn--primary btn--lg" 
                    onClick={handleStartQuiz}
                    disabled={quizLoading}
                  >
                    {quizLoading ? <span className="btn-spinner"></span> : 'Take Section Quiz →'}
                  </button>
                  <p className="quiz-cta__hint">
                    Score at least 75% to unlock Section {(selectedChunk.order || 0) + 2}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Flashcards View */}
          {selectedChunk && activeTab === 'flashcards' && !quizResult && (
            <div className="learning-material">
              <div className="learning-material__header">
                <span className="badge badge--pending" style={{ marginBottom: '0.5rem' }}>
                  Interactive Study Cards
                </span>
                <h2 className="learning-material__title">Flashcards: {selectedChunk.title}</h2>
              </div>

              <div className="flashcards-grid">
                {selectedChunk.flashcards.map((fc, i) => (
                  <div 
                    key={i} 
                    className={`flashcard ${flippedCards.has(i) ? 'flashcard--flipped' : ''}`}
                    onClick={() => toggleFlashcard(i)}
                  >
                    <div className="flashcard__inner">
                      <div className="flashcard__front">
                        <span className="flashcard__label">Question #{i + 1}</span>
                        <p>{fc.question}</p>
                        <span className="flashcard__hint">🔄 Click card to reveal answer</span>
                      </div>
                      <div className="flashcard__back">
                        <span className="flashcard__label">Answer</span>
                        <p>{fc.answer}</p>
                        <span className="flashcard__hint">🔄 Click to flip back</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedChunk.hasQuiz && (
                <div className="quiz-cta">
                  <button 
                    className="btn btn--primary btn--lg" 
                    onClick={handleStartQuiz}
                    disabled={quizLoading}
                  >
                    Ready? Start the Section Quiz →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Quiz Mode */}
          {activeTab === 'quiz' && !quizResult && (
            <div className="quiz-section">
              <div className="quiz-section__header">
                <div>
                  <span className="badge badge--processing" style={{ marginBottom: '0.4rem' }}>
                    <span className="badge__dot"></span> Mastery Assessment
                  </span>
                  <h2 className="quiz-section__title">Quiz: {selectedChunk.title}</h2>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setActiveTab('material')}>
                  ← Back to Notes
                </button>
              </div>

              {error && (
                <div className="alert alert--error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="quiz-questions">
                {quizQuestions.map((q, index) => {
                  const letters = ['A', 'B', 'C', 'D', 'E'];
                  return (
                    <div key={q.questionId} className="quiz-question">
                      <div className="quiz-question__text">
                        <span className="quiz-question__number">{index + 1}</span>
                        <span>{q.question}</span>
                      </div>
                      <div className="quiz-options">
                        {q.options.map((option, oi) => {
                          const isSelected = userAnswers[q.questionId] === option;
                          return (
                            <label 
                              key={oi} 
                              className={`quiz-option ${isSelected ? 'quiz-option--selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name={q.questionId}
                                value={option}
                                checked={isSelected}
                                onChange={() => handleAnswerSelect(q.questionId, option)}
                              />
                              <span className="quiz-option__letter">{letters[oi] || oi + 1}</span>
                              <span className="quiz-option__text">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                className="btn btn--primary btn--lg btn--full" 
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz}
              >
                {submittingQuiz ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Grading with AI...</span>
                  </>
                ) : (
                  <span>Submit Quiz Answers ✨</span>
                )}
              </button>
            </div>
          )}

          {/* Quiz Results Screen */}
          {quizResult && (
            <div className="quiz-results">
              <div className={`quiz-results__banner ${quizResult.passed ? 'quiz-results__banner--pass' : 'quiz-results__banner--fail'}`}>
                <div className="quiz-results__score-circle">
                  <span className="quiz-results__score-value">{quizResult.score}%</span>
                </div>
                <div className="quiz-results__verdict">
                  {quizResult.passed ? (
                    <>
                      <h2 className="quiz-results__heading">🎉 Excellent Work! Passed!</h2>
                      <p>{quizResult.correctAnswers} of {quizResult.totalQuestions} questions answered correctly.</p>
                      {quizResult.nextChunkUnlocked && (
                        <p className="quiz-results__unlock-msg">
                          <span>🔓</span> Next video section is now unlocked!
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="quiz-results__heading">Keep Going, Review & Retry</h2>
                      <p>{quizResult.correctAnswers} of {quizResult.totalQuestions} correct. You need 75% to unlock the next section.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="quiz-results__details">
                {quizResult.results.map((r, i) => (
                  <div key={i} className={`result-card ${r.isCorrect ? 'result-card--correct' : 'result-card--wrong'}`}>
                    <div className="result-card__header">
                      <span className="result-card__icon">{r.isCorrect ? '✅' : '❌'}</span>
                      <span className="result-card__question">Question {i + 1}: {r.question}</span>
                    </div>
                    <div className="result-card__body">
                      <p>
                        <strong>Your answer:</strong>{' '}
                        <span style={{ color: r.isCorrect ? 'var(--success)' : 'var(--error)' }}>
                          {r.selectedAnswer || 'No answer selected'}
                        </span>
                      </p>
                      {!r.isCorrect && (
                        <p><strong>Correct answer:</strong> <span style={{ color: 'var(--success)' }}>{r.correctAnswer}</span></p>
                      )}
                      {r.explanation && (
                        <div className="result-card__explanation">
                          <strong>💡 Concept Explanation:</strong> {r.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="quiz-results__actions">
                {!quizResult.passed && (
                  <button className="btn btn--primary btn--lg" onClick={handleRetryQuiz}>
                    <span>🔄</span>
                    <span>Retry Quiz</span>
                  </button>
                )}
                <button className="btn btn--ghost" onClick={() => { setActiveTab('material'); setQuizResult(null); }}>
                  <span>←</span>
                  <span>Review Section Notes</span>
                </button>
                {quizResult.passed && (
                  <button 
                    className="btn btn--primary btn--lg" 
                    onClick={() => {
                      const nextChunk = chunks.find(c => c.order === selectedChunk.order + 1);
                      if (nextChunk) {
                        handleChunkSelect({ ...nextChunk, isUnlocked: true });
                      } else {
                        navigate('/dashboard');
                      }
                    }}
                  >
                    <span>Next Section →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sections Sidebar */}
        <div className="lecture-page__sidebar">
          <div className="sidebar__header">
            <span className="sidebar__title">Course Sections</span>
            <span className="sidebar__count-badge">{chunks.length} Parts</span>
          </div>
          
          <div className="chunk-list">
            {chunks.map((chunk) => {
              const isSelected = selectedChunk?._id === chunk._id;
              return (
                <button
                  key={chunk._id}
                  className={`chunk-item ${isSelected ? 'chunk-item--active' : ''} ${!chunk.isUnlocked ? 'chunk-item--locked' : ''} ${chunk.isPassed ? 'chunk-item--passed' : ''}`}
                  onClick={() => handleChunkSelect(chunk)}
                  disabled={!chunk.isUnlocked}
                  title={!chunk.isUnlocked ? 'Pass the previous quiz to unlock' : chunk.title}
                >
                  <div className="chunk-item__icon-box">
                    {chunk.isPassed ? '✓' : chunk.isUnlocked ? (isSelected ? '▶' : '🔓') : '🔒'}
                  </div>
                  <div className="chunk-item__info">
                    <span className="chunk-item__number">Section {chunk.chunkNumber}</span>
                    <span className="chunk-item__title">{chunk.title || `Part ${chunk.chunkNumber}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturePage;
