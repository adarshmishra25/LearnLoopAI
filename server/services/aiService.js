
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

const isGeminiConfigured = () => {
  return (
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    process.env.GEMINI_API_KEY.trim().length > 10
  );
};

const initializeAI = () => {
  if (!isGeminiConfigured()) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
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
  const ai = initializeAI();

  if (!ai) {
    console.warn(`[AI Service] GEMINI_API_KEY not configured. Using fallback generator for chunk ${chunkNumber}.`);
    return generateFallbackMaterial(chunkTranscript, chunkNumber, lectureTitle);
  }

  const prompt = `You are an expert multilingual educator and curriculum designer.
Analyze this lecture transcript chunk and generate structured learning material.

MANDATORY LANGUAGE RULE:
Regardless of the language of the transcript or lecture (whether it is in Hindi, Hinglish, Spanish, French, German, Japanese, Chinese, Arabic, Russian, Portuguese, or any other language or mixed dialects), you MUST TRANSLATE and output ALL content ENTIRELY in clear, fluent, professional ENGLISH.
Do NOT use the non-English source language in your output (except for universal scientific terms or code).

Lecture: "${lectureTitle}"
Chunk ${chunkNumber}

Transcript:
"""
${chunkTranscript}
"""

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just raw JSON):
{
  "title": "A concise descriptive title in ENGLISH for this section (max 10 words)",
  "summary": "A clear 2-3 paragraph summary in ENGLISH of the key content covered in this section",
  "keyConcepts": ["concept1 in English", "concept2 in English", "concept3 in English", "concept4 in English", "concept5 in English"],
  "keyTakeaways": ["takeaway1 in English", "takeaway2 in English", "takeaway3 in English"],
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
    const result = await ai.generateContent(prompt);
    const responseText = result.response.text();
    
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
  const ai = initializeAI();

  if (!ai) {
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
    const result = await ai.generateContent(prompt);
    const responseText = result.response.text();
    
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

export default {
  generateLearningMaterial,
  generateQuizQuestions,
};
