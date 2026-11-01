import Chunk from '../models/Chunk.js';
import Lecture from '../models/Lecture.js';
import QuizAttempt from '../models/QuizAttempt.js';

export const getChunk = async (req, res) => {
  try {
    const chunk = await Chunk.findById(req.params.chunkId);

    if (!chunk) {
      return res.status(404).json({ success: false, message: 'Chunk not found' });
    }

    const lecture = await Lecture.findById(chunk.lecture);
    if (!lecture || lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const isUnlocked = await isChunkUnlocked(chunk, req.user._id);
    if (!isUnlocked) {
      return res.status(403).json({ success: false, message: 'This chunk is locked. Complete the previous quiz first.' });
    }

    res.json({
      success: true,
      chunk: {
        _id: chunk._id,
        chunkNumber: chunk.chunkNumber,
        title: chunk.title,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        transcript: chunk.transcript,
        summary: chunk.summary,
        keyConcepts: chunk.keyConcepts,
        keyTakeaways: chunk.keyTakeaways,
        flashcards: chunk.flashcards,
        hasQuiz: chunk.quizQuestions && chunk.quizQuestions.length > 0,
        order: chunk.order,
      },
    });
  } catch (error) {
    console.error('Get chunk error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getChunkQuiz = async (req, res) => {
  try {
    const chunk = await Chunk.findById(req.params.chunkId);

    if (!chunk) {
      return res.status(404).json({ success: false, message: 'Chunk not found' });
    }

    const lecture = await Lecture.findById(chunk.lecture);
    if (!lecture || lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const isUnlocked = await isChunkUnlocked(chunk, req.user._id);
    if (!isUnlocked) {
      return res.status(403).json({ success: false, message: 'This chunk is locked' });
    }

    if (!chunk.quizQuestions || chunk.quizQuestions.length === 0) {
      return res.status(404).json({ success: false, message: 'No quiz available for this chunk' });
    }

    const questions = chunk.quizQuestions.map(q => ({
      questionId: q.questionId,
      question: q.question,
      options: q.options,
    }));

    res.json({ success: true, questions, chunkTitle: chunk.title });
  } catch (error) {
    console.error('Get quiz error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide answers' });
    }

    const chunk = await Chunk.findById(req.params.chunkId);

    if (!chunk) {
      return res.status(404).json({ success: false, message: 'Chunk not found' });
    }

    const lecture = await Lecture.findById(chunk.lecture);
    if (!lecture || lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const isUnlocked = await isChunkUnlocked(chunk, req.user._id);
    if (!isUnlocked) {
      return res.status(403).json({ success: false, message: 'This chunk is locked' });
    }

    if (!chunk.quizQuestions || chunk.quizQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'No quiz available for this chunk' });
    }

    const totalQuestions = chunk.quizQuestions.length;
    let correctAnswers = 0;
    const gradedAnswers = [];

    for (const q of chunk.quizQuestions) {
      const userAnswer = answers.find(a => a.questionId === q.questionId);
      const selectedAnswer = userAnswer ? userAnswer.selectedAnswer : '';
      const isCorrect = selectedAnswer === q.correctAnswer;

      if (isCorrect) correctAnswers++;

      gradedAnswers.push({
        questionId: q.questionId,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
      });
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 75;

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      lecture: lecture._id,
      chunk: chunk._id,
      score,
      totalQuestions,
      correctAnswers,
      passed,
      answers: gradedAnswers,
    });

    let nextChunkUnlocked = false;
    if (passed) {
      const nextChunk = await Chunk.findOne({
        lecture: lecture._id,
        order: chunk.order + 1,
      });
      nextChunkUnlocked = !!nextChunk;
    }

    const results = chunk.quizQuestions.map(q => {
      const graded = gradedAnswers.find(a => a.questionId === q.questionId);
      return {
        questionId: q.questionId,
        question: q.question,
        options: q.options,
        selectedAnswer: graded.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: graded.isCorrect,
        explanation: q.explanation,
      };
    });

    res.json({
      success: true,
      score,
      totalQuestions,
      correctAnswers,
      passed,
      nextChunkUnlocked,
      results,
    });
  } catch (error) {
    console.error('Submit quiz error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const isChunkUnlocked = async (chunk, userId) => {
  if (chunk.isUnlockedByDefault) return true;

  const prevChunk = await Chunk.findOne({
    lecture: chunk.lecture,
    order: chunk.order - 1,
  });

  if (!prevChunk) return true;

  const passedAttempt = await QuizAttempt.findOne({
    user: userId,
    chunk: prevChunk._id,
    passed: true,
  });

  return !!passedAttempt;
};
