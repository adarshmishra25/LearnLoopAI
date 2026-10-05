/**
 * Transcription Service
 * 
 * For the MVP, we use YouTube's built-in captions via youtube-transcript.
 * This service is a wrapper that could be replaced with Whisper, AssemblyAI, etc.
 * 
 * The actual transcript fetching happens in youtubeService.js since YouTube
 * provides captions directly (no audio extraction needed).
 */

import { getYouTubeTranscript } from './youtubeService.js';

/**
 * Get transcript for a video. Currently delegates to YouTube captions.
 * Can be swapped for Whisper/AssemblyAI for audio-based transcription.
 */
export const transcribeFromYouTube = async (videoId) => {
  return await getYouTubeTranscript(videoId);
};

export default {
  transcribeFromYouTube,
};
