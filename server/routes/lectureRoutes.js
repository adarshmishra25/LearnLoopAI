import express from 'express';
import { createLecture, getUserLectures, getLecture, deleteLecture, reprocessLecture } from '../controllers/lectureController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All lecture routes are protected

router.post('/', createLecture);
router.get('/', getUserLectures);
router.get('/:id', getLecture);
router.delete('/:id', deleteLecture);
router.post('/:id/reprocess', reprocessLecture);

export default router;
