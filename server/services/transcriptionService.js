import { getYouTubeTranscript } from './youtubeService.js';

export const transcribeFromYouTube = async (videoId) => {
  return await getYouTubeTranscript(videoId);
};

export default {
  transcribeFromYouTube,
};
