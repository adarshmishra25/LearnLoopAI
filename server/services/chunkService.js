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

  // Calculate dynamic chunk target duration to produce 4 to 8 manageable learning modules
  const lastSegment = segments[segments.length - 1];
  const duration = totalDuration || (lastSegment ? lastSegment.offset + (lastSegment.duration || 0) : 0);

  let targetChunkDuration = 300; // 5 minutes default
  if (duration > 5400) {
    // Over 90 mins: target ~8 chunks
    targetChunkDuration = Math.round(duration / 8);
  } else if (duration > 2400) {
    // 40 to 90 mins: target ~6 chunks
    targetChunkDuration = Math.round(duration / 6);
  } else if (duration > 900) {
    // 15 to 40 mins: target ~4 chunks
    targetChunkDuration = Math.round(duration / 4);
  } else if (duration > 300) {
    // 5 to 15 mins: target ~3 chunks
    targetChunkDuration = Math.max(120, Math.round(duration / 3));
  } else {
    // Under 5 mins: target ~2 chunks
    targetChunkDuration = Math.max(90, Math.round(duration / 2));
  }

  const minChunkDuration = Math.max(60, Math.round(targetChunkDuration * 0.5));
  
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

    if (chunkDuration >= targetChunkDuration && endsWithSentence) {
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
    if (lastChunkDuration < minChunkDuration && chunks.length > 0) {
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
