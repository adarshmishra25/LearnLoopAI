import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  chunkNumber: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  transcript: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  keyConcepts: {
    type: [String],
    default: [],
  },
  keyTakeaways: {
    type: [String],
    default: [],
  },
  flashcards: [
    {
      question: { type: String },
      answer: { type: String },
    },
  ],
  quizQuestions: [
    {
      questionId: { type: String },
      question: { type: String },
      options: [{ type: String }],
      correctAnswer: { type: String },
      explanation: { type: String },
    },
  ],
  isUnlockedByDefault: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

chunkSchema.index({ lecture: 1, order: 1 });

const Chunk = mongoose.model('Chunk', chunkSchema);

export default Chunk;
