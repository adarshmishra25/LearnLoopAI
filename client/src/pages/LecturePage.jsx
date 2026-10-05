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

  // Quiz state
  const [quizMode, setQuizMode] = useState(false);
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
      setChunks(res.data.chunks);
      
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
      setError(err.response?.data?.message || 'Failed to load lecture');
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
    setQuizMode(false);
    setQuizResult(null);
    setFlippedCards(new Set());
  };

  const handleStartQuiz = async () => {
    setQuizLoading(true);
    setQuizResult(null);
    setUserAnswers({});

    try {
      const res = await getChunkQuiz(selectedChunk._id);
      setQuizQuestions(res.data.questions);
      setQuizMode(true);
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
      setError('Please answer all questions before submitting');
      setTimeout(() => setError(''), 3000);
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
            setChunks(res.data.chunks);
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
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return '';
    const videoId = match[1];
    const startTime = selectedChunk ? selectedChunk.startTime : 0;
    return `https://www.youtube.com/embed/${videoId}?start=${startTime}`;
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner"></div>
        <p>Loading lecture...</p>
      </div>
    );
  }

  if (error && !lecture) {
    return (
      <div className="error-page">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="lecture-page">
      {/* Lecture Header */}
      <div className="lecture-page__header">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <button
            className="btn btn--secondary btn--sm"
            onClick={handleReprocess}
            disabled={reprocessing || lecture?.status === 'processing'}
            title="Regenerate all chunks, summaries, and quizzes using Gemini AI"
          >
            {reprocessing || lecture?.status === 'processing' ? '⚡ Processing with Gemini...' : '✨ Regenerate with AI'}
          </button>
        </div>
        <div className="lecture-page__info">
          <h1 className="lecture-page__title">{lecture?.title}</h1>
          <div className="lecture-page__progress">
            <div className="progress-bar progress-bar--sm">
              <div className="progress-bar__fill" style={{ width: `${lecture?.progress || 0}%` }}></div>
            </div>
            <span className="progress-label">{lecture?.progress || 0}% complete</span>
          </div>
        </div>
      </div>

      <div className="lecture-page__content">
        {/* Left: Video + Learning Material */}
        <div className="lecture-page__main">
          {/* Video Player */}
          <div className="video-container">
            <iframe
              src={getVideoEmbedUrl(lecture?.videoUrl)}
              title={lecture?.title}
              allowFullScreen
              className="video-iframe"
            ></iframe>
          </div>

          {/* Learning Material or Quiz */}
          {selectedChunk && !quizMode && !quizResult && (
            <div className="learning-material">
              <h2 className="learning-material__title">{selectedChunk.title}</h2>

              {/* Summary */}
              <section className="material-section">
                <h3 className="material-section__heading">📝 Summary</h3>
                <p className="material-section__text">{selectedChunk.summary}</p>
              </section>

              {/* Key Concepts */}
              {selectedChunk.keyConcepts && selectedChunk.keyConcepts.length > 0 && (
                <section className="material-section">
                  <h3 className="material-section__heading">💡 Key Concepts</h3>
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
                  <h3 className="material-section__heading">🎯 Key Takeaways</h3>
                  <ul className="takeaways-list">
                    {selectedChunk.keyTakeaways.map((t, i) => (
                      <li key={i} className="takeaway-item">{t}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Flashcards */}
              {selectedChunk.flashcards && selectedChunk.flashcards.length > 0 && (
                <section className="material-section">
                  <h3 className="material-section__heading">🃏 Flashcards</h3>
                  <div className="flashcards-grid">
                    {selectedChunk.flashcards.map((fc, i) => (
                      <div 
                        key={i} 
                        className={`flashcard ${flippedCards.has(i) ? 'flashcard--flipped' : ''}`}
                        onClick={() => toggleFlashcard(i)}
                      >
                        <div className="flashcard__inner">
                          <div className="flashcard__front">
                            <span className="flashcard__label">Question</span>
                            <p>{fc.question}</p>
                            <span className="flashcard__hint">Click to flip</span>
                          </div>
                          <div className="flashcard__back">
                            <span className="flashcard__label">Answer</span>
                            <p>{fc.answer}</p>
                            <span className="flashcard__hint">Click to flip back</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Take Quiz Button */}
              {selectedChunk.hasQuiz && (
                <div className="quiz-cta">
                  <button 
                    className="btn btn--primary btn--lg" 
                    onClick={handleStartQuiz}
                    disabled={quizLoading}
                  >
                    {quizLoading ? <span className="btn-spinner"></span> : '📝 Take Quiz'}
                  </button>
                  <p className="quiz-cta__hint">Score 75% or higher to unlock the next section</p>
                </div>
              )}
            </div>
          )}

          {/* Quiz Mode */}
          {quizMode && !quizResult && (
            <div className="quiz-section">
              <div className="quiz-section__header">
                <h2 className="quiz-section__title">Quiz: {selectedChunk.title}</h2>
                <button className="btn btn--ghost btn--sm" onClick={() => setQuizMode(false)}>
                  ← Back to Material
                </button>
              </div>

              {error && <div className="alert alert--error">{error}</div>}

              <div className="quiz-questions">
                {quizQuestions.map((q, index) => (
                  <div key={q.questionId} className="quiz-question">
                    <h4 className="quiz-question__text">
                      <span className="quiz-question__number">{index + 1}</span>
                      {q.question}
                    </h4>
                    <div className="quiz-options">
                      {q.options.map((option, oi) => (
                        <label 
                          key={oi} 
                          className={`quiz-option ${userAnswers[q.questionId] === option ? 'quiz-option--selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={q.questionId}
                            value={option}
                            checked={userAnswers[q.questionId] === option}
                            onChange={() => handleAnswerSelect(q.questionId, option)}
                          />
                          <span className="quiz-option__radio"></span>
                          <span className="quiz-option__text">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn btn--primary btn--lg btn--full" 
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz}
              >
                {submittingQuiz ? <span className="btn-spinner"></span> : 'Submit Quiz'}
              </button>
            </div>
          )}

          {/* Quiz Results */}
          {quizResult && (
            <div className="quiz-results">
              <div className={`quiz-results__banner ${quizResult.passed ? 'quiz-results__banner--pass' : 'quiz-results__banner--fail'}`}>
                <div className="quiz-results__score-circle">
                  <span className="quiz-results__score-value">{quizResult.score}%</span>
                </div>
                <div className="quiz-results__verdict">
                  {quizResult.passed ? (
                    <>
                      <h2 className="quiz-results__heading">🎉 Passed!</h2>
                      <p>{quizResult.correctAnswers}/{quizResult.totalQuestions} correct</p>
                      {quizResult.nextChunkUnlocked && (
                        <p className="quiz-results__unlock-msg">🔓 Next section unlocked!</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="quiz-results__heading">Not quite there</h2>
                      <p>{quizResult.correctAnswers}/{quizResult.totalQuestions} correct • Need 75% to pass</p>
                    </>
                  )}
                </div>
              </div>

              {/* Detailed Results */}
              <div className="quiz-results__details">
                {quizResult.results.map((r, i) => (
                  <div key={i} className={`result-card ${r.isCorrect ? 'result-card--correct' : 'result-card--wrong'}`}>
                    <div className="result-card__header">
                      <span className="result-card__icon">{r.isCorrect ? '✅' : '❌'}</span>
                      <span className="result-card__question">{r.question}</span>
                    </div>
                    <div className="result-card__body">
                      <p><strong>Your answer:</strong> {r.selectedAnswer || 'No answer'}</p>
                      {!r.isCorrect && <p><strong>Correct answer:</strong> {r.correctAnswer}</p>}
                      {r.explanation && <p className="result-card__explanation">💡 {r.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="quiz-results__actions">
                {!quizResult.passed && (
                  <button className="btn btn--primary btn--lg" onClick={handleRetryQuiz}>
                    🔄 Try Again
                  </button>
                )}
                <button className="btn btn--ghost" onClick={() => { setQuizMode(false); setQuizResult(null); }}>
                  ← Back to Material
                </button>
                {quizResult.passed && quizResult.nextChunkUnlocked && (
                  <button className="btn btn--primary btn--lg" onClick={() => {
                    const nextChunk = chunks.find(c => c.order === selectedChunk.order + 1);
                    if (nextChunk) handleChunkSelect({ ...nextChunk, isUnlocked: true });
                  }}>
                    Next Section →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Chunk Sidebar */}
        <div className="lecture-page__sidebar">
          <h3 className="sidebar__title">Sections</h3>
          <div className="chunk-list">
            {chunks.map((chunk) => (
              <button
                key={chunk._id}
                className={`chunk-item ${
                  selectedChunk?._id === chunk._id ? 'chunk-item--active' : ''
                } ${!chunk.isUnlocked ? 'chunk-item--locked' : ''} ${
                  chunk.isPassed ? 'chunk-item--passed' : ''
                }`}
                onClick={() => handleChunkSelect(chunk)}
                disabled={!chunk.isUnlocked}
              >
                <span className="chunk-item__icon">
                  {chunk.isPassed ? '✅' : chunk.isUnlocked ? '🔓' : '🔒'}
                </span>
                <span className="chunk-item__info">
                  <span className="chunk-item__number">Section {chunk.chunkNumber}</span>
                  <span className="chunk-item__title">{chunk.title || `Part ${chunk.chunkNumber}`}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturePage;
