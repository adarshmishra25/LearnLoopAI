import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import lectureRoutes from './routes/lectureRoutes.js';
import chunkRoutes from './routes/chunkRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LearnLoop API is running',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/chunks', chunkRoutes);

// Connect to MongoDB and start server
const startServer = async () => {
  await connectDB();

  // Create collections so the database appears in MongoDB Compass
  const collections = await mongoose.connection.db.listCollections().toArray();
  if (collections.length === 0) {
    await mongoose.connection.db.createCollection('users');
    console.log('Initialized learnloop database with users collection');
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
