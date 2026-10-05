import Lecture from '../models/Lecture.js';
import Chunk from '../models/Chunk.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { extractVideoId, isValidYouTubeUrl, getVideoMetadata } from '../services/youtubeService.js';
import { transcribeFromYouTube } from '../services/transcriptionService.js';
import { splitTranscriptIntoChunks } from '../services/chunkService.js';
import { generateLearningMaterial, generateQuizQuestions } from '../services/aiService.js';

/**
 * POST /api/lectures
 * Create a new lecture and start processing
 */
export const createLecture = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: 'Please provide a YouTube video URL' });
    }

    if (!isValidYouTubeUrl(videoUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
    }

    const videoId = extractVideoId(videoUrl);
    const metadata = await getVideoMetadata(videoId);

    const lecture = await Lecture.create({
      user: req.user._id,
      videoUrl,
      title: metadata.title,
      platform: 'youtube',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Lecture created. Processing will begin.',
      lecture: {
        id: lecture._id,
        title: lecture.title,
        videoUrl: lecture.videoUrl,
        status: lecture.status,
      },
    });

    // Process in background (don't await in response)
    processLecture(lecture._id, videoId).catch(err => {
      console.error('Background processing error:', err.message);
    });

  } catch (error) {
    console.error('Create lecture error:', error.message);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Background processing of a lecture
 */
const processLecture = async (lectureId, videoId) => {
  try {
    // Update status to processing
    await Lecture.findByIdAndUpdate(lectureId, { status: 'processing' });

    // Step 1: Get transcript
    console.log(`[Processing] Getting transcript for lecture ${lectureId}...`);
    const transcriptData = await transcribeFromYouTube(videoId);

    // Update lecture with transcript
    await Lecture.findByIdAndUpdate(lectureId, {
      transcript: transcriptData.transcript,
      duration: transcriptData.duration,
    });

    // Step 2: Split into chunks
    console.log(`[Processing] Splitting transcript into chunks...`);
    const rawChunks = splitTranscriptIntoChunks(transcriptData.segments, transcriptData.duration);

    if (rawChunks.length === 0) {
      throw new Error('Failed to create any chunks from the transcript');
    }

    const lecture = await Lecture.findById(lectureId);

    // Step 3: Generate AI content and create chunks
    console.log(`[Processing] Generating AI content for ${rawChunks.length} chunks...`);
    
    for (const rawChunk of rawChunks) {
      console.log(`[Processing] Generating content for chunk ${rawChunk.chunkNumber}/${rawChunks.length}...`);
      
      // Generate learning material
      const material = await generateLearningMaterial(
        rawChunk.transcript,
        rawChunk.chunkNumber,
        lecture.title
      );

      // Generate quiz questions
      const quizQuestions = await generateQuizQuestions(
        rawChunk.transcript,
        material.title,
        lecture.title
      );

      // Create chunk in DB
      await Chunk.create({
        lecture: lectureId,
        chunkNumber: rawChunk.chunkNumber,
        title: material.title,
        startTime: rawChunk.startTime,
        endTime: rawChunk.endTime,
        transcript: rawChunk.transcript,
        summary: material.summary,
        keyConcepts: material.keyConcepts,
        keyTakeaways: material.keyTakeaways,
        flashcards: material.flashcards,
        quizQuestions,
        order: rawChunk.order,
        isUnlockedByDefault: rawChunk.isUnlockedByDefault,
      });
    }

    // Mark lecture as completed
    await Lecture.findByIdAndUpdate(lectureId, { status: 'completed' });
    console.log(`[Processing] Lecture ${lectureId} processing completed!`);

  } catch (error) {
    console.error(`[Processing] Failed for lecture ${lectureId}:`, error.message);
    await Lecture.findByIdAndUpdate(lectureId, { status: 'failed' });
  }
};

/**
 * GET /api/lectures
 * Get all lectures for the authenticated user
 */
export const getUserLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Enrich with chunk/progress data
    const enrichedLectures = await Promise.all(
      lectures.map(async (lecture) => {
        const chunks = await Chunk.find({ lecture: lecture._id }).sort({ order: 1 });
        const totalChunks = chunks.length;

        // Get quiz attempts for this user+lecture
        const attempts = await QuizAttempt.find({
          user: req.user._id,
          lecture: lecture._id,
          passed: true,
        });

        const passedChunkIds = new Set(attempts.map(a => a.chunk.toString()));
        
        // Count unlocked chunks: first chunk + chunks with passed previous quiz
        let unlockedCount = 0;
        let completedCount = 0;
        
        for (const chunk of chunks) {
          if (chunk.isUnlockedByDefault || passedChunkIds.has(chunk._id.toString())) {
            unlockedCount++;
          }
          if (passedChunkIds.has(chunk._id.toString())) {
            completedCount++;
          }
        }

        // Also count chunks unlocked by passing the previous chunk's quiz
        for (let i = 1; i < chunks.length; i++) {
          const prevChunk = chunks[i - 1];
          if (passedChunkIds.has(prevChunk._id.toString())) {
            unlockedCount = Math.max(unlockedCount, i + 1);
          }
        }

        unlockedCount = Math.min(unlockedCount, totalChunks);
        
        const latestAttempt = await QuizAttempt.findOne({
          user: req.user._id,
          lecture: lecture._id,
        }).sort({ attemptedAt: -1 });

        return {
          _id: lecture._id,
          title: lecture.title,
          videoUrl: lecture.videoUrl,
          status: lecture.status,
          duration: lecture.duration,
          totalChunks,
          completedChunks: completedCount,
          progress: totalChunks > 0 ? Math.round((completedCount / totalChunks) * 100) : 0,
          latestScore: latestAttempt ? latestAttempt.score : null,
          createdAt: lecture.createdAt,
        };
      })
    );

    res.json({ success: true, lectures: enrichedLectures });
  } catch (error) {
    console.error('Get lectures error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/lectures/:id
 * Get a single lecture with its chunks and user progress
 */
export const getLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this lecture' });
    }

    const chunks = await Chunk.find({ lecture: lecture._id }).sort({ order: 1 });

    // Determine which chunks are unlocked for this user
    const attempts = await QuizAttempt.find({
      user: req.user._id,
      lecture: lecture._id,
      passed: true,
    });

    const passedChunkIds = new Set(attempts.map(a => a.chunk.toString()));

    const chunksWithStatus = chunks.map((chunk, index) => {
      let isUnlocked = chunk.isUnlockedByDefault;

      // A chunk is unlocked if the PREVIOUS chunk's quiz has been passed
      if (index > 0) {
        const prevChunk = chunks[index - 1];
        if (passedChunkIds.has(prevChunk._id.toString())) {
          isUnlocked = true;
        }
      }

      const isPassed = passedChunkIds.has(chunk._id.toString());

      return {
        _id: chunk._id,
        chunkNumber: chunk.chunkNumber,
        title: chunk.title,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        order: chunk.order,
        isUnlocked,
        isPassed,
        // Only include full content if unlocked
        ...(isUnlocked ? {
          transcript: chunk.transcript,
          summary: chunk.summary,
          keyConcepts: chunk.keyConcepts,
          keyTakeaways: chunk.keyTakeaways,
          flashcards: chunk.flashcards,
          hasQuiz: chunk.quizQuestions && chunk.quizQuestions.length > 0,
        } : {}),
      };
    });

    const completedCount = passedChunkIds.size;
    const totalChunks = chunks.length;

    res.json({
      success: true,
      lecture: {
        _id: lecture._id,
        title: lecture.title,
        videoUrl: lecture.videoUrl,
        platform: lecture.platform,
        status: lecture.status,
        duration: lecture.duration,
        totalChunks,
        completedChunks: completedCount,
        progress: totalChunks > 0 ? Math.round((completedCount / totalChunks) * 100) : 0,
      },
      chunks: chunksWithStatus,
    });
  } catch (error) {
    console.error('Get lecture error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/lectures/:id
 */
export const deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete all related data
    await Chunk.deleteMany({ lecture: lecture._id });
    await QuizAttempt.deleteMany({ lecture: lecture._id });
    await Lecture.findByIdAndDelete(lecture._id);

    res.json({ success: true, message: 'Lecture deleted' });
  } catch (error) {
    console.error('Delete lecture error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/lectures/:id/reprocess
 * Reprocess lecture chunks using AI
 */
export const reprocessLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (lecture.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Clean up existing chunks and attempts
    await Chunk.deleteMany({ lecture: lecture._id });
    await QuizAttempt.deleteMany({ lecture: lecture._id });
    await Lecture.findByIdAndUpdate(lecture._id, { status: 'processing' });

    res.json({ success: true, message: 'Lecture reprocessing started' });

    const videoId = extractVideoId(lecture.videoUrl);
    processLecture(lecture._id, videoId).catch(err => {
      console.error('Reprocess error:', err.message);
    });
  } catch (error) {
    console.error('Reprocess error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
