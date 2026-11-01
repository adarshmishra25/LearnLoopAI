import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isGeminiConfigured = () => {
  return (
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    process.env.GEMINI_API_KEY.trim().length > 10
  );
};

const callGeminiWithRetry = async (prompt, maxRetries = 3) => {
  if (!isGeminiConfigured()) {
    return null;
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const candidateModels = [
    primaryModel,
    'gemini-3.6-flash',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const isTemporary = 
          msg.includes('503') || 
          msg.includes('high demand') || 
          msg.includes('Service Unavailable') || 
          msg.includes('429') || 
          msg.includes('ResourceExhausted');

        if (isTemporary && attempt < maxRetries) {
          const delay = attempt * 2000;
          console.warn(`[AI Service] ${modelName} temporary high demand spike (503/429). Retrying in ${delay / 1000}s (attempt ${attempt}/${maxRetries})...`);
          await sleep(delay);
          continue;
        }

        if (attempt === maxRetries) {
          console.warn(`[AI Service] ${modelName} exhausted ${maxRetries} retry attempts.`);
        }
      }
    }
  }

  throw lastError || new Error('All Gemini API attempts failed');
};

const generateFallbackMaterial = (chunkTranscript, chunkNumber, lectureTitle) => {
  const isLikelyEnglish = /^[\x00-\x7F\s.,!?'"()-]+$/.test(chunkTranscript.slice(0, 200));

  const sentences = isLikelyEnglish
    ? chunkTranscript
        .replace(/\s+/g, ' ')
        .split(/(?<=[.?!])\s+/)
        .filter(s => s.trim().length > 15)
    : [];

  const cleanTitle = lectureTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'the lecture topic';
  const summaryPart1 = sentences.slice(0, 3).join(' ') || 
    `This section covers the core foundational principles and methodologies presented in Part ${chunkNumber} of "${cleanTitle}".`;
  const summaryPart2 = sentences.slice(3, 6).join(' ') || 
    `Key mechanisms, structural models, and practical applications are explained with focus on conceptual mastery.`;
  const summary = `${summaryPart1}\n\n${summaryPart2}`;

  const defaultEnglishConcepts = [
    'Core Architecture',
    'Fundamental Logic',
    'Practical Methodology',
    'Critical Analysis',
    'Execution Patterns'
  ];

  let keyConcepts = defaultEnglishConcepts;
  if (isLikelyEnglish) {
    const words = chunkTranscript.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 5);
    const uniqueWords = [...new Set(words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))];
    if (uniqueWords.length >= 5) {
      keyConcepts = uniqueWords.slice(0, 5);
    }
  }

  const keyTakeaways = [
    `Mastering the foundational mechanisms introduced in Part ${chunkNumber}.`,
    `Applying systematic reasoning to understand how these concepts integrate.`,
    `Reviewing key problem-solving patterns before advancing to subsequent modules.`,
  ];

  const flashcards = [
    {
      question: `What is the primary objective of Part ${chunkNumber}?`,
      answer: `To establish a clear understanding of ${keyConcepts[0]} and foundational concepts.`,
    },
    {
      question: `Why is ${keyConcepts[0]} critical in this context?`,
      answer: `It forms the structural basis upon which the subsequent concepts and practical applications depend.`,
    },
    {
      question: `How should ${keyConcepts[1] || 'the core methodology'} be implemented?`,
      answer: `Through structured, step-by-step application and systematic analysis.`,
    },
    {
      question: `What is a common consideration or best practice highlighted in this section?`,
      answer: `Ensuring consistency and verifying core assumptions before proceeding.`,
    },
    {
      question: `What is the key takeaway to remember from Part ${chunkNumber}?`,
      answer: keyTakeaways[0],
    },
  ];

  return {
    title: `Part ${chunkNumber}: ${keyConcepts.slice(0, 2).join(' & ')}`,
    summary,
    keyConcepts: keyConcepts.slice(0, 5),
    keyTakeaways: keyTakeaways.slice(0, 3),
    flashcards,
  };
};

const generateFallbackQuiz = (chunkTranscript, chunkTitle, lectureTitle) => {
  const cleanTitle = chunkTitle || lectureTitle || 'this section';

  return [
    {
      questionId: 'q1',
      question: `What is the main focus of "${cleanTitle}"?`,
      options: [
        `Core principles and structural overview of the topic`,
        `Historical background unrelated to modern practice`,
        `Superficial introduction with no technical details`,
        `Unrelated administrative announcements`,
      ],
      correctAnswer: `Core principles and structural overview of the topic`,
      explanation: 'The section focuses directly on establishing foundational principles and technical concepts in English.',
    },
    {
      questionId: 'q2',
      question: `According to this section, which best describes the recommended approach?`,
      options: [
        `Ignoring foundational patterns`,
        `Applying structured, step-by-step methodology`,
        `Guesswork without validation`,
        `Skipping conceptual understanding`,
      ],
      correctAnswer: `Applying structured, step-by-step methodology`,
      explanation: 'Structured methodologies ensure consistent understanding and robust application.',
    },
    {
      questionId: 'q3',
      question: `Why is active recall and testing critical when studying "${cleanTitle}"?`,
      options: [
        `It has no measurable benefit`,
        `It solidifies retention and reveals conceptual gaps`,
        `It is only useful for rote memorization`,
        `It replaces the need to review materials`,
      ],
      correctAnswer: `It solidifies retention and reveals conceptual gaps`,
      explanation: 'Testing and active recall strengthen synaptic pathways and uncover misunderstandings early.',
    },
    {
      questionId: 'q4',
      question: `Which concept is emphasized as essential for practical problem solving?`,
      options: [
        `Systematic analysis and verifying core principles`,
        `Disregarding practical examples completely`,
        `Relying solely on external intuition`,
        `Avoiding systematic problem solving`,
      ],
      correctAnswer: `Systematic analysis and verifying core principles`,
      explanation: 'The material highlights systematic analysis as pivotal for mastering this topic.',
    },
    {
      questionId: 'q5',
      question: `What is the expected outcome after completing this chunk?`,
      options: [
        `Immediate mastery with no further review needed`,
        `Demonstrated comprehension of key concepts and readiness for subsequent topics`,
        `A requirement to reset the entire course`,
        `Inability to proceed to the next module`,
      ],
      correctAnswer: `Demonstrated comprehension of key concepts and readiness for subsequent topics`,
      explanation: 'Passing the chunk quiz unlocks the subsequent section and confirms topic comprehension.',
    },
  ];
};

export const generateLearningMaterial = async (chunkTranscript, chunkNumber, lectureTitle) => {
  if (!isGeminiConfigured()) {
    console.warn(`[AI Service] GEMINI_API_KEY not configured. Using fallback generator for chunk ${chunkNumber}.`);
    return generateFallbackMaterial(chunkTranscript, chunkNumber, lectureTitle);
  }

  const prompt = `You are an expert multilingual educator and curriculum designer.
Analyze this lecture transcript chunk and generate structured learning material.

MANDATORY LANGUAGE RULE:
Regardless of the language of the transcript or lecture (whether it is in Hindi, Hinglish, Spanish, French, German, Japanese, Chinese, Arabic, Russian, Portuguese, or any other language or mixed dialects), you MUST TRANSLATE and output ALL content ENTIRELY in clear, fluent, professional ENGLISH.
Do NOT use the non-English source language in your output (except for universal scientific terms or code).

Lecture: "${lectureTitle}"
Chunk Number: ${chunkNumber}

Transcript:
"""
${chunkTranscript}
"""

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
{
  "title": "Concise section title in ENGLISH (max 8 words)",
  "summary": "Comprehensive 2-3 paragraph summary in ENGLISH explaining the concepts clearly",
  "keyConcepts": [
    "Concept 1 in English",
    "Concept 2 in English",
    "Concept 3 in English",
    "Concept 4 in English",
    "Concept 5 in English"
  ],
  "keyTakeaways": [
    "Actionable takeaway 1 in English",
    "Actionable takeaway 2 in English",
    "Actionable takeaway 3 in English"
  ],
  "flashcards": [
    {"question": "English question 1?", "answer": "English answer 1"},
    {"question": "English question 2?", "answer": "English answer 2"},
    {"question": "English question 3?", "answer": "English answer 3"},
    {"question": "English question 4?", "answer": "English answer 4"},
    {"question": "English question 5?", "answer": "English answer 5"}
  ]
}

Rules:
- Everything (title, summary, keyConcepts, keyTakeaways, flashcards) MUST BE IN ENGLISH
- Return ONLY valid JSON, no other text
- Keep concepts and takeaways concise but informative
- Generate exactly 5 flashcards
- Make flashcards test understanding, not just recall
- Summary should be comprehensive but readable`;

  try {
    const responseText = await callGeminiWithRetry(prompt);
    let cleanJson = responseText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    const parsed = JSON.parse(cleanJson);
    
    return {
      title: parsed.title || `Section ${chunkNumber}`,
      summary: parsed.summary || '',
      keyConcepts: parsed.keyConcepts || [],
      keyTakeaways: parsed.keyTakeaways || [],
      flashcards: (parsed.flashcards || []).map(fc => ({
        question: fc.question,
        answer: fc.answer,
      })),
    };
  } catch (error) {
    console.error(`AI learning material generation failed (${error.message}). Falling back to algorithmic generator.`);
    return generateFallbackMaterial(chunkTranscript, chunkNumber, lectureTitle);
  }
};

export const generateQuizQuestions = async (chunkTranscript, chunkTitle, lectureTitle) => {
  if (!isGeminiConfigured()) {
    console.warn(`[AI Service] GEMINI_API_KEY not configured. Using fallback quiz for "${chunkTitle}".`);
    return generateFallbackQuiz(chunkTranscript, chunkTitle, lectureTitle);
  }

  const prompt = `You are an expert multilingual quiz creator. Create a quiz based on this lecture transcript section.

MANDATORY LANGUAGE RULE:
Regardless of the language of the transcript, chunk title, or lecture (whether it is in Hindi, Hinglish, Spanish, French, German, etc.), ALL questions, options, correct answers, and explanations MUST BE GENERATED ENTIRELY IN FLUENT ENGLISH.
Do NOT output any non-English words.

Lecture: "${lectureTitle}"
Section: "${chunkTitle}"

Transcript:
"""
${chunkTranscript}
"""

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
{
  "questions": [
    {
      "question": "Question text in ENGLISH?",
      "options": ["English Option A", "English Option B", "English Option C", "English Option D"],
      "correctAnswer": "English Option A",
      "explanation": "Brief explanation in ENGLISH of why this is correct"
    }
  ]
}

Rules:
- ALL questions, options, correctAnswer, and explanations MUST BE IN ENGLISH
- Generate exactly 5 multiple choice questions
- Each question must have exactly 4 options
- correctAnswer must exactly match one of the options
- Questions should test understanding of the material
- Mix difficulty levels: 2 easy, 2 medium, 1 hard
- Return ONLY valid JSON, no other text`;

  try {
    const responseText = await callGeminiWithRetry(prompt);
    let cleanJson = responseText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    const parsed = JSON.parse(cleanJson);
    
    return (parsed.questions || []).map((q, index) => ({
      questionId: `q${index + 1}`,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    }));
  } catch (error) {
    console.error(`AI quiz generation failed (${error.message}). Falling back to algorithmic generator.`);
    return generateFallbackQuiz(chunkTranscript, chunkTitle, lectureTitle);
  }
};

export const generateAllChunksContent = async (rawChunks, lectureTitle) => {
  if (!isGeminiConfigured()) {
    console.warn(`[AI Service] GEMINI_API_KEY not configured. Using fallback generator for all chunks.`);
    const fallbackResults = {};
    for (const chunk of rawChunks) {
      const material = generateFallbackMaterial(chunk.transcript, chunk.chunkNumber, lectureTitle);
      const quiz = generateFallbackQuiz(chunk.transcript, material.title, lectureTitle);
      fallbackResults[chunk.chunkNumber] = { ...material, quizQuestions: quiz };
    }
    return fallbackResults;
  }

  const BATCH_SIZE = 3;
  const chunkBatches = [];
  for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
    chunkBatches.push(rawChunks.slice(i, i + BATCH_SIZE));
  }

  const allResults = {};

  for (let b = 0; b < chunkBatches.length; b++) {
    const batch = chunkBatches[b];
    console.log(`[AI Service] Processing batch ${b + 1}/${chunkBatches.length} (${batch.length} chunks) with Gemini...`);

    const sectionsPrompt = batch.map(c => {
      const textSample = c.transcript.length > 2000 ? c.transcript.slice(0, 2000) + '...' : c.transcript;
      return `=== CHUNK ${c.chunkNumber} (Time: ${Math.floor(c.startTime / 60)}m - ${Math.floor(c.endTime / 60)}m) ===\n${textSample}`;
    }).join('\n\n');

    const prompt = `You are an expert educator and curriculum designer.
Analyze the following lecture sections and generate structured learning material AND quiz questions for each section in a SINGLE JSON response.

MANDATORY LANGUAGE RULE:
Regardless of the language of the transcript or lecture (Hindi, Hinglish, Spanish, French, etc.), you MUST TRANSLATE and output ALL content ENTIRELY in clear, fluent, professional ENGLISH.

Lecture Title: "${lectureTitle}"

${sectionsPrompt}

Generate a JSON object with a "chunks" array containing an entry for EACH chunk above.
EXACT JSON FORMAT:
{
  "chunks": [
    {
      "chunkNumber": 1,
      "title": "Concise section title in ENGLISH (max 10 words)",
      "summary": "Clear 2-3 paragraph summary in ENGLISH of this section",
      "keyConcepts": ["Concept 1 in English", "Concept 2 in English", "Concept 3 in English", "Concept 4 in English", "Concept 5 in English"],
      "keyTakeaways": ["Takeaway 1 in English", "Takeaway 2 in English", "Takeaway 3 in English"],
      "flashcards": [
        {"question": "English question 1?", "answer": "English answer 1"},
        {"question": "English question 2?", "answer": "English answer 2"},
        {"question": "English question 3?", "answer": "English answer 3"},
        {"question": "English question 4?", "answer": "English answer 4"},
        {"question": "English question 5?", "answer": "English answer 5"}
      ],
      "quizQuestions": [
        {
          "questionId": "q1",
          "question": "Question text in ENGLISH?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation in ENGLISH"
        },
        {
          "questionId": "q2",
          "question": "Question text in ENGLISH?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation in ENGLISH"
        },
        {
          "questionId": "q3",
          "question": "Question text in ENGLISH?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation in ENGLISH"
        },
        {
          "questionId": "q4",
          "question": "Question text in ENGLISH?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation in ENGLISH"
        },
        {
          "questionId": "q5",
          "question": "Question text in ENGLISH?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation in ENGLISH"
        }
      ]
    }
  ]
}

Rules:
- Everything MUST BE IN ENGLISH.
- Return ONLY valid JSON, no markdown code fence or commentary.
- Provide an entry for EVERY chunk requested in this batch (chunkNumbers: ${batch.map(c => c.chunkNumber).join(', ')}).
- For each chunk, provide exactly 5 flashcards and 5 multiple choice questions.
- correctAnswer must exactly match one of the 4 options.`;

    try {
      const responseText = await callGeminiWithRetry(prompt, 3);
      let cleanJson = responseText.trim();
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleanJson);

      const generatedChunks = Array.isArray(parsed.chunks) ? parsed.chunks : (Array.isArray(parsed) ? parsed : []);

      for (const rawChunk of batch) {
        const found = generatedChunks.find(c => Number(c.chunkNumber) === Number(rawChunk.chunkNumber)) || generatedChunks[batch.indexOf(rawChunk)];
        if (found && found.title) {
          allResults[rawChunk.chunkNumber] = {
            title: found.title || `Section ${rawChunk.chunkNumber}`,
            summary: found.summary || '',
            keyConcepts: found.keyConcepts || [],
            keyTakeaways: found.keyTakeaways || [],
            flashcards: (found.flashcards || []).map(fc => ({
              question: fc.question,
              answer: fc.answer,
            })),
            quizQuestions: (found.quizQuestions || []).map((q, idx) => ({
              questionId: `q${idx + 1}`,
              question: q.question,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || '',
            })),
          };
        } else {
          const material = generateFallbackMaterial(rawChunk.transcript, rawChunk.chunkNumber, lectureTitle);
          const quiz = generateFallbackQuiz(rawChunk.transcript, material.title, lectureTitle);
          allResults[rawChunk.chunkNumber] = { ...material, quizQuestions: quiz };
        }
      }
    } catch (error) {
      console.error(`[AI Service] Batch AI generation failed (${error.message}). Using fallback for this batch.`);
      for (const rawChunk of batch) {
        const material = generateFallbackMaterial(rawChunk.transcript, rawChunk.chunkNumber, lectureTitle);
        const quiz = generateFallbackQuiz(rawChunk.transcript, material.title, lectureTitle);
        allResults[rawChunk.chunkNumber] = { ...material, quizQuestions: quiz };
      }
    }

    if (b < chunkBatches.length - 1) {
      await sleep(1000);
    }
  }

  return allResults;
};

export default {
  generateLearningMaterial,
  generateQuizQuestions,
  generateAllChunksContent,
};
