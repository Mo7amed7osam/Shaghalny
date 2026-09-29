export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: 'Student' | 'Client' | 'Admin';
  verifiedSkills: VerifiedSkill[];
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  description?: string;
  website?: string;
  companyLogoUrl?: string;
  isVerified?: boolean;
  university?: string;
  portfolioLinks?: string[];
  jobsCompleted?: number;
  reviews?: Review[];
  balance?: number;
}

export interface VerifiedSkill {
  skillId?: string;
  skill?: { _id: string; name: string } | string;
  score: number;
  verifiedAt?: string;
}

export interface Review {
  jobId?: string;
  clientName: string;
  rating: number;
  comment?: string;
  jobTitle?: string;
  jobType?: 'freelance' | 'internship';
     workMode?: 'online' | 'onsite' | 'hybrid'; 
  positions?: number;
  positionsFilled?: number;
  createdAt?: string;
}

export interface Job {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  requiredSkills: Array<{ _id: string; name: string } | string>;
  applicants: string[];
  budgetMin?: number;
  budgetMax?: number;
  duration?: string;
    type?: 'freelance' | 'internship';
  employer?: Pick<User, '_id' | 'id' | 'name' | 'email' | 'website' | 'companyLogoUrl' | 'isVerified'>;
  company?: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  verifiedClient?: boolean;
  clientVerified?: boolean;
  status?: 'open' | 'in_progress' | 'completed' | 'closed';
}

export interface Skill {
  id?: string;
  _id?: string;
  name: string;
  description: string;
}

export interface Interview {
  id?: string;
  _id?: string;
  studentId: string;
  skillId: string;
  questions?: string[];
  responses?: { question: string; videoUrl: string }[];
  reviewStatus?: 'pending' | 'pass' | 'fail';
  score?: number;
  isCompleted?: boolean;
}

export interface Proposal {
  id?: string;
  _id?: string;
  jobId: string;
  studentId: string;
  details: string;
  proposedBudget?: number;
  status?: 'submitted' | 'shortlisted' | 'accepted' | 'rejected';
}

export interface Contract {
  id?: string;
  _id?: string;
  jobId: any;
  clientId: any;
  studentId: any;
  proposalId?: string;
  agreedBudget: number;
  status: 'active' | 'submitted' | 'accepted' | 'completed';
  escrowStatus: 'held_in_escrow' | 'released';
  submittedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface TopUpRequest {
  _id: string;
  clientId: any;
  amount: number;
  screenshotPath?: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  note?: string;
  adminId?: any;
  decisionReason?: string;
  createdAt?: string;
  processedAt?: string;
}

export interface WithdrawalRequest {
  _id: string;
  studentId: any;
  amount: number;
  payoutMethod: 'BANK' | 'INSTAPAY';
  bankAccount?: string;
  instapayHandle?: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  adminId?: any;
  decisionReason?: string;
  note?: string;
  createdAt?: string;
  processedAt?: string;
}
