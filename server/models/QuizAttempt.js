import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  chunk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chunk',
    required: true,
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  correctAnswers: {
    type: Number,
    required: true,
  },
  passed: {
    type: Boolean,
    required: true,
  },
  answers: [
    {
      questionId: { type: String },
      selectedAnswer: { type: String },
      correctAnswer: { type: String },
      isCorrect: { type: Boolean },
    },
  ],
  attemptedAt: {
    type: Date,
    default: Date.now,
  },
});

quizAttemptSchema.index({ user: 1, chunk: 1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;
