export type InterviewRecommendation = 'pass' | 'needs_review' | 'fail';
export type InterviewReviewStatus = 'pending' | 'pass' | 'fail';
export type InterviewStatus = 'started' | 'in_progress' | 'completed' | 'failed';

export interface InterviewQuestion {
  id: string;
  text: string;
  order: number;
}

export interface InterviewAnswer {
  answerId: string;
  questionId: string;
  question: string;
  videoUrl: string;
  cameraVideoUrl?: string | null;
  screenVideoUrl?: string | null;
  transcript: string | null;
  processingError?: string | null;
  score: number | null;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: InterviewRecommendation;
  evaluationSource: 'ai' | 'manual_review' | 'demo';
}

export interface InterviewSession {
  isDemo?: boolean;
  sessionId: string;
  skill: string;
  status: InterviewStatus;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  finalScore: number | null;
  finalRecommendation: InterviewRecommendation | null;
  reviewStatus: InterviewReviewStatus;
}

export interface StartInterviewPayload {
  skill: string;
  skillId?: string;
  jobId?: string;
  proposalId?: string;
}

export interface StartInterviewResponse {
  success: true;
  sessionId: string;
  questions: InterviewQuestion[];
}

export interface InterviewSessionResponse {
  success: true;
  session: InterviewSession;
}

export interface SubmitInterviewAnswerResponse {
  success: true;
  answerId: string;
  evaluation: Omit<
    InterviewAnswer,
    'answerId' | 'questionId' | 'question' | 'videoUrl' | 'cameraVideoUrl' | 'screenVideoUrl'
  >;
  completed: boolean;
  finalScore: number | null;
  finalRecommendation: InterviewRecommendation | null;
}

export interface InterviewResultResponse {
  isDemo?: boolean;
  success: true;
  sessionId: string;
  status: InterviewStatus;
  skill: string;
  finalScore: number | null;
  recommendation: InterviewRecommendation | null;
  reviewStatus: InterviewReviewStatus;
  answers: InterviewAnswer[];
}
