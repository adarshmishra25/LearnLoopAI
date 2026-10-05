import express from 'express';
import { getChunk, getChunkQuiz, submitQuiz } from '../controllers/chunkController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All chunk routes are protected

router.get('/:chunkId', getChunk);
router.get('/:chunkId/quiz', getChunkQuiz);
router.post('/:chunkId/quiz/submit', submitQuiz);

export default router;
