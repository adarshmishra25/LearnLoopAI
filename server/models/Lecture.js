import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['youtube'],
    default: 'youtube',
  },
  duration: {
    type: Number,
    default: 0,
  },
  transcript: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

lectureSchema.index({ user: 1 });

const Lecture = mongoose.model('Lecture', lectureSchema);

export default Lecture;
