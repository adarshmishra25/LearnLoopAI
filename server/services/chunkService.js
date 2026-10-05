/**
 * Chunk Service
 * 
 * Splits a transcript into meaningful learning chunks based on
 * transcript segments and timing information.
 */

/**
 * Split transcript segments into logical chunks.
 * Each chunk targets ~3-5 minutes of content for optimal learning.
 */
export const splitTranscriptIntoChunks = (segments, totalDuration) => {
  if (!segments || segments.length === 0) {
    return [];
  }

  // Target chunk duration in seconds (3-5 minutes)
  const TARGET_CHUNK_DURATION = 240; // 4 minutes
  const MIN_CHUNK_DURATION = 120;    // 2 minutes minimum
  
  const chunks = [];
  let currentChunk = {
    segments: [],
    startTime: 0,
    endTime: 0,
    text: '',
  };

  for (const segment of segments) {
    currentChunk.segments.push(segment);
    currentChunk.endTime = segment.offset + segment.duration;

    if (currentChunk.segments.length === 1) {
      currentChunk.startTime = segment.offset;
    }

    const chunkDuration = currentChunk.endTime - currentChunk.startTime;

    // Check for natural break points (sentences ending with period)
    const endsWithSentence = segment.text.trim().match(/[.!?]$/);

    if (chunkDuration >= TARGET_CHUNK_DURATION && endsWithSentence) {
      currentChunk.text = currentChunk.segments.map(s => s.text).join(' ');
      chunks.push({ ...currentChunk });
      currentChunk = { segments: [], startTime: 0, endTime: 0, text: '' };
    }
  }

  // Add remaining segments as last chunk
  if (currentChunk.segments.length > 0) {
    currentChunk.text = currentChunk.segments.map(s => s.text).join(' ');
    
    // If the last chunk is too small and we have previous chunks, merge it
    const lastChunkDuration = currentChunk.endTime - currentChunk.startTime;
    if (lastChunkDuration < MIN_CHUNK_DURATION && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.segments = [...lastChunk.segments, ...currentChunk.segments];
      lastChunk.endTime = currentChunk.endTime;
      lastChunk.text = lastChunk.segments.map(s => s.text).join(' ');
    } else {
      chunks.push({ ...currentChunk });
    }
  }

  // If we ended up with no chunks from the splitting logic, make one big chunk
  if (chunks.length === 0 && segments.length > 0) {
    chunks.push({
      segments,
      startTime: segments[0].offset,
      endTime: segments[segments.length - 1].offset + segments[segments.length - 1].duration,
      text: segments.map(s => s.text).join(' '),
    });
  }

  return chunks.map((chunk, index) => ({
    chunkNumber: index + 1,
    startTime: Math.round(chunk.startTime),
    endTime: Math.round(chunk.endTime),
    transcript: chunk.text,
    order: index + 1,
    isUnlockedByDefault: index === 0, // First chunk is always unlocked
  }));
};

export default {
  splitTranscriptIntoChunks,
};
