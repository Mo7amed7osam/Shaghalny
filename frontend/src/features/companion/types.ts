export type CompanionState =
  | 'idle'
  | 'greeting'
  | 'thinking'
  | 'searching'
  | 'reviewing_cv'
  | 'writing_proposal'
  | 'success'
  | 'error';

export type CompanionIntent = 'chat' | 'find_jobs' | 'review_cv' | 'write_proposal';
export type CompanionLang = 'en' | 'ar';
export type CompanionPage =
  | 'jobs'
  | 'profile'
  | 'skill_verification'
  | 'career_roadmap'
  | 'dashboard'
  | 'contracts'
  | 'interview_history';

export interface CardNote {
  code: string;
  skills?: string[];
  source?: string;
}

/** Built by the backend from stored jobs; never parsed from model text. */
export interface CompanionJobCard {
  id: string;
  title: string;
  company: string | null;
  companyVerified: boolean;
  sourceType: 'internal' | 'external';
  sourceName: string | null;
  type: 'freelance' | 'internship' | null;
  workMode: 'online' | 'onsite' | 'hybrid' | null;
  location: string | null;
  duration: string | null;
  budget: { min?: number | null; max?: number | null; currency?: string; text?: string; unpaid?: boolean } | null;
  requiredSkills: { name: string; verified: boolean }[];
  missingVerifiedSkills: string[];
  alreadyApplied: boolean;
  canApply: boolean;
  listingUrl: string | null;
  applyUrl: string | null;
  reasons: CardNote[];
  cautions: CardNote[];
}

export interface CvReview {
  example: boolean;
  summary: string | null;
  strengths: string[];
  issues: { section: string; problem: string }[];
  rewrites: { section: string; before: string; after: string; note: string }[];
  missingFacts: string[];
}

export interface ProposalDraft {
  jobId: string;
  text: string;
  example: boolean;
}

export type DemoNotice = 'not_configured' | 'quota' | 'rate_limited' | 'timeout' | 'provider_error';

export interface CompanionResponse {
  mode: 'ai' | 'demo';
  notice?: DemoNotice;
  reply: string;
  cards: CompanionJobCard[];
  actions: CompanionPage[];
  cvReview: CvReview | null;
  proposal: ProposalDraft | null;
  needs: 'cv_text' | 'job' | null;
}

export interface CompanionRequestInput {
  text: string;
  intent: CompanionIntent;
  jobId?: string | null;
  cvText?: string | null;
}

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  intent?: CompanionIntent;
  response?: Omit<CompanionResponse, 'reply'>;
  /** Set on failed turns so the panel can offer a retry. */
  error?: { message: string; retryable: boolean };
  /** The request that produced this assistant turn, for retry. */
  request?: CompanionRequestInput;
}
