export const splitTranscriptIntoChunks = (segments, totalDuration) => {
  if (!segments || segments.length === 0) {
    return [];
  }

  const lastSegment = segments[segments.length - 1];
  const duration = totalDuration || (lastSegment ? lastSegment.offset + (lastSegment.duration || 0) : 0);

  let targetChunkDuration = 300;
  if (duration > 5400) {
    targetChunkDuration = Math.round(duration / 8);
  } else if (duration > 2400) {
    targetChunkDuration = Math.round(duration / 6);
  } else if (duration > 900) {
    targetChunkDuration = Math.round(duration / 4);
  } else if (duration > 300) {
    targetChunkDuration = Math.max(120, Math.round(duration / 3));
  } else {
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

    const endsWithSentence = segment.text.trim().match(/[.!?]$/);

    if (chunkDuration >= targetChunkDuration && endsWithSentence) {
      currentChunk.text = currentChunk.segments.map(s => s.text).join(' ');
      chunks.push({ ...currentChunk });
      currentChunk = { segments: [], startTime: 0, endTime: 0, text: '' };
    }
  }

  if (currentChunk.segments.length > 0) {
    currentChunk.text = currentChunk.segments.map(s => s.text).join(' ');
    
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
    isUnlockedByDefault: index === 0,
  }));
};

export default {
  splitTranscriptIntoChunks,
};
