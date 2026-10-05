import { YoutubeTranscript } from 'youtube-transcript';

export const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

export const isValidYouTubeUrl = (url) => {
  return extractVideoId(url) !== null;
};

export const getVideoMetadata = async (videoId) => {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) throw new Error('Failed to fetch video metadata');
    const data = await response.json();
    return {
      title: data.title || 'Untitled Lecture',
      author: data.author_name || '',
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error.message);
    return { title: 'Untitled Lecture', author: '' };
  }
};

export const getYouTubeTranscript = async (videoId) => {
  try {
    let transcriptItems = null;

    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    } catch {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    }
    
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript available for this video. The video may not have captions enabled.');
    }

    const segments = transcriptItems.map(item => ({
      text: item.text,
      offset: item.offset / 1000,
      duration: item.duration / 1000,
    }));

    const fullText = segments.map(s => s.text).join(' ');
    const totalDuration = segments.length > 0
      ? segments[segments.length - 1].offset + segments[segments.length - 1].duration
      : 0;

    return {
      transcript: fullText,
      segments,
      duration: Math.round(totalDuration),
    };
  } catch (error) {
    console.error('YouTube transcript error:', error.message);
    throw new Error(`Failed to get transcript: ${error.message}`);
  }
};
