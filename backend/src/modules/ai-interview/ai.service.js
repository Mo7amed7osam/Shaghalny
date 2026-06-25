const axios = require('axios');
const path = require('path');

const {
  cleanupTemporaryArtifacts,
  extractAudioFromVideo,
} = require('./media.service');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION || '2023-06-01';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';

const fallbackQuestions = (skill) => [
  {
    id: 'q1',
    text: `Tell me about a practical project where you used ${skill} and what your responsibility was.`,
    order: 1,
  },
  {
    id: 'q2',
    text: `What is a common problem students face when working with ${skill}, and how would you solve it for a client?`,
    order: 2,
  },
  {
    id: 'q3',
    text: `Which best practices do you follow when delivering freelance work using ${skill}?`,
    order: 3,
  },
];

const manualReviewEvaluation = (reason, transcript = null) => ({
  transcript,
  score: null,
  feedback: reason,
  strengths: transcript ? ['Transcript captured successfully.'] : [],
  weaknesses: ['Reliable automated evaluation not available in current config.'],
  recommendation: 'needs_review',
  evaluationSource: 'manual_review',
  processingError: reason,
});

const normalizeJsonText = (value) =>
  String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const parseJson = (value) => {
  try {
    return JSON.parse(normalizeJsonText(value));
  } catch (error) {
    return null;
  }
};

const clampScore = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(numericValue)));
};

const normalizeRecommendation = (value, score) => {
  if (['pass', 'needs_review', 'fail'].includes(value)) {
    return value;
  }
  if (score === null) {
    return 'needs_review';
  }
  if (score >= 70) {
    return 'pass';
  }
  if (score >= 50) {
    return 'needs_review';
  }
  return 'fail';
};

const callOpenRouter = async (prompt) => {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: OPENROUTER_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost',
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'Shaghalny',
      },
      timeout: 45000,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || '';
};

const callAnthropic = async (prompt) => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    }
  );

  const blocks = response.data?.content || [];
  return blocks
    .filter((item) => item?.type === 'text')
    .map((item) => item.text || '')
    .join('')
    .trim();
};

const callConfiguredLlm = async (prompt) => {
  if (OPENROUTER_API_KEY) {
    return callOpenRouter(prompt);
  }
  if (ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  return '';
};

const transcribeAudio = async ({ filePath, mimeType, originalName }) => {
  if (!GROQ_API_KEY) {
    return {
      transcript: null,
      reason: 'Automatic transcription unavailable. Configure GROQ_API_KEY to transcribe video audio.',
    };
  }

  if (typeof fetch !== 'function' || typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    return {
      transcript: null,
      reason: 'Node runtime does not expose fetch/FormData for transcription upload.',
    };
  }

  try {
    const buffer = await require('fs').promises.readFile(filePath);
    const formData = new FormData();
    formData.append('model', GROQ_STT_MODEL);
    formData.append('response_format', 'verbose_json');
    formData.append('file', new Blob([buffer], { type: mimeType || 'audio/wav' }), originalName || 'answer.wav');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        transcript: null,
        source: 'manual_review',
        reason: `Groq transcription failed: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const transcript = String(data?.text || '').trim();

    return {
      transcript: transcript || null,
      reason: transcript ? null : 'Transcription returned empty text.',
    };
  } catch (error) {
    return {
      transcript: null,
      reason: `Groq transcription failed: ${error.message}`,
    };
  }
};

const generateInterviewQuestions = async (skill) => {
  if (!OPENROUTER_API_KEY && !ANTHROPIC_API_KEY) {
    return fallbackQuestions(skill);
  }

  const prompt = [
    `Generate 3 practical interview questions for a student freelancer being verified for skill: "${skill}".`,
    'Questions must:',
    '- fit university student level',
    '- test practical understanding',
    '- be answerable verbally in 1-2 minutes',
    '- avoid being too advanced',
    '- focus on real freelancing work',
    'Return JSON only:',
    '[',
    '  {',
    '    "id": "q1",',
    '    "text": "Question text",',
    '    "order": 1',
    '  }',
    ']',
  ].join('\n');

  try {
    const rawText = await callConfiguredLlm(prompt);
    const parsed = parseJson(rawText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return fallbackQuestions(skill);
    }

    return parsed.slice(0, 3).map((item, index) => ({
      id: String(item.id || `q${index + 1}`),
      text: String(item.text || '').trim() || fallbackQuestions(skill)[index].text,
      order: Number(item.order || index + 1),
    }));
  } catch (error) {
    console.error('AI question generation failed:', error.response?.data || error.message);
    return fallbackQuestions(skill);
  }
};

const evaluateVideoAnswer = async ({ skill, question, filePath, mimeType, originalName }) => {
  let extractedAudio = null;

  try {
    extractedAudio = await extractAudioFromVideo(filePath);
    if (extractedAudio?.noAudio) {
      // Uploaded video lacks audio — require manual review with a clear reason
      return manualReviewEvaluation(extractedAudio.reason, null);
    }
  } catch (error) {
    return manualReviewEvaluation(error.message, null);
  }

  try {
    const transcriptResult = await transcribeAudio({
      filePath: extractedAudio.audioPath,
      mimeType: extractedAudio.audioMimeType,
      originalName: `${path.parse(originalName || 'answer').name || 'answer'}.wav`,
    });

    if (!transcriptResult.transcript) {
      return manualReviewEvaluation(transcriptResult.reason, null);
    }

    if (!OPENROUTER_API_KEY && !ANTHROPIC_API_KEY) {
      return manualReviewEvaluation(
        'Transcript captured, but no LLM evaluator configured. Configure OPENROUTER_API_KEY or ANTHROPIC_API_KEY.',
        transcriptResult.transcript
      );
    }

    const prompt = [
      "You are evaluating a student freelancer's spoken interview answer.",
      `Skill:\n${skill}`,
      `Question:\n${question}`,
      `Student answer / transcript:\n${transcriptResult.transcript}`,
      'Evaluate based on:',
      '- relevance',
      '- correctness',
      '- clarity',
      '- practical understanding',
      '- communication',
      'Return JSON only:',
      '{',
      '  "score": 0,',
      '  "feedback": "short useful feedback",',
      '  "strengths": ["strength 1", "strength 2"],',
      '  "weaknesses": ["weakness 1"],',
      '  "recommendation": "pass | needs_review | fail"',
      '}',
      'Rules:',
      '- pass if score >= 70',
      '- needs_review if score is 50-69',
      '- fail if score < 50',
    ].join('\n');

    try {
      const rawText = await callConfiguredLlm(prompt);
      const parsed = parseJson(rawText);
      if (!parsed || typeof parsed !== 'object') {
        return manualReviewEvaluation(
          'AI evaluator returned invalid JSON. Manual review required.',
          transcriptResult.transcript
        );
      }

      const score = clampScore(parsed.score);
      return {
        transcript: transcriptResult.transcript,
        score,
        feedback:
          typeof parsed.feedback === 'string' && parsed.feedback.trim()
            ? parsed.feedback.trim()
            : 'Manual review recommended.',
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.map((item) => String(item)).filter(Boolean)
          : [],
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses.map((item) => String(item)).filter(Boolean)
          : [],
        recommendation: normalizeRecommendation(parsed.recommendation, score),
        evaluationSource: 'ai',
        processingError: null,
      };
    } catch (error) {
      console.error('AI evaluation failed:', error.response?.data || error.message);
      return manualReviewEvaluation(
        `AI evaluation failed: ${error.message}`,
        transcriptResult.transcript
      );
    }
  } finally {
    await cleanupTemporaryArtifacts(extractedAudio?.tempDir, extractedAudio?.downloadedTempDir);
  }
};

module.exports = {
  evaluateVideoAnswer,
  generateInterviewQuestions,
};
