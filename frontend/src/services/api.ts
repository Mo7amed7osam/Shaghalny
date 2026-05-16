import http from '@/api/http';
import { API } from '@/api/endpoints';

export const setAuthToken = (token?: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const registerUser = async (userData: any) => {
  const response = await http.post(API.auth.register, userData);
  return response.data;
};

export const loginUser = async (credentials: any) => {
  const response = await http.post(API.auth.login, credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await http.get(API.auth.me);
  return response.data;
};

export const getSkills = async () => {
  const response = await http.get(API.skills.list);
  return response.data;
};

export const postJob = async (jobData: any) => {
  const response = await http.post(API.jobs.create, jobData);
  return response.data;
};

export const getJobs = async (params?: {
  search?: string;
  skills?: string[];
  minBudget?: number | string;
  maxBudget?: number | string;
  duration?: string;
}) => {
  const response = await http.get(API.jobs.list, { params });
  return response.data;
};

export const getJobDetails = async (jobId: string) => {
  const response = await http.get(API.jobs.details(jobId));
  return response.data;
};

export const getClientJobs = async () => {
  const response = await http.get(API.jobs.clientJobs);
  return response.data;
};

export const submitProposal = async (jobId: string, proposalData: any) => {
  const response = await http.post(API.jobs.apply(jobId), proposalData);
  return response.data;
};

export const getJobProposals = async (jobId: string) => {
  const response = await http.get(API.jobs.proposals(jobId));
  return response.data;
};

export const getClientProposals = async () => {
  const response = await http.get(API.jobs.clientProposals);
  return response.data;
};

export const getMatchedCandidates = async (jobId: string) => {
  const response = await http.get(API.jobs.matches(jobId));
  return response.data;
};

export const getWalletBalance = async () => {
  const response = await http.get(API.wallet.balance);
  return response.data;
};

export const createTopUpRequest = async (payload: { amount: number; screenshot: File; note?: string }) => {
  const formData = new FormData();
  formData.append('amount', String(payload.amount));
  formData.append('screenshot', payload.screenshot);
  if (payload.note) {
    formData.append('note', payload.note);
  }
  const response = await http.post(API.wallet.topups, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getTopUpRequests = async () => {
  const response = await http.get(API.wallet.topups);
  return response.data;
};

export const downloadTopUpScreenshot = async (id: string) => {
  const response = await http.get(API.wallet.topupScreenshot(id), { responseType: 'blob' });
  return response.data;
};

export const createWithdrawalRequest = async (payload: {
  amount: number;
  bankAccount?: string;
  instapayHandle?: string;
  note?: string;
}) => {
  const response = await http.post(API.wallet.withdrawals, payload);
  return response.data;
};

export const getWithdrawalRequests = async () => {
  const response = await http.get(API.wallet.withdrawals);
  return response.data;
};

export const getAdminTopUps = async (status?: string) => {
  const response = await http.get(API.admin.topups, { params: status ? { status } : undefined });
  return response.data;
};

export const approveAdminTopUp = async (id: string) => {
  const response = await http.post(API.admin.topupApprove(id));
  return response.data;
};

export const declineAdminTopUp = async (id: string, payload: { reason?: string }) => {
  const response = await http.post(API.admin.topupDecline(id), payload);
  return response.data;
};

export const getAdminWithdrawals = async (status?: string) => {
  const response = await http.get(API.admin.withdrawals, { params: status ? { status } : undefined });
  return response.data;
};

export const approveAdminWithdrawal = async (id: string) => {
  const response = await http.post(API.admin.withdrawalApprove(id));
  return response.data;
};

export const declineAdminWithdrawal = async (id: string, payload: { reason?: string }) => {
  const response = await http.post(API.admin.withdrawalDecline(id), payload);
  return response.data;
};

export const selectStudentForJob = async (jobId: string, studentId: string) => {
  const response = await http.post(API.jobs.select(jobId), { studentId });
  return response.data;
};

export const acceptProposal = async (proposalId: string, payload: { agreedBudget?: number }) => {
  const response = await http.post(API.proposals.accept(proposalId), payload);
  return response.data;
};

export const getContracts = async (params?: { status?: string }) => {
  const response = await http.get(API.contracts.list, { params });
  return response.data;
};

export const getContractDetails = async (contractId: string) => {
  const response = await http.get(API.contracts.details(contractId));
  return response.data;
};

export const submitContractWork = async (
  contractId: string,
  payload: { message: string; links?: string[]; attachments?: string[] }
) => {
  const response = await http.post(API.contracts.submit(contractId), payload);
  return response.data;
};

export const acceptContractWork = async (contractId: string) => {
  const response = await http.post(API.contracts.accept(contractId));
  return response.data;
};

export const requestContractChanges = async (contractId: string) => {
  const response = await http.post(API.contracts.requestChanges(contractId));
  return response.data;
};

export const submitContractReview = async (
  contractId: string,
  payload: { rating: number; comment?: string }
) => {
  const response = await http.post(API.contracts.review(contractId), payload);
  return response.data;
};

export const submitJobReview = async (
  jobId: string,
  payload: { studentId: string; rating: number; comment?: string }
) => {
  const response = await http.post(API.jobs.reviews(jobId), payload);
  return response.data;
};

export const getStudentProfile = async (studentId: string, params?: { jobId?: string }) => {
  const response = await http.get(`/students/${studentId}/profile`, { params });
  return response.data;
};

export const updateStudentProfile = async (studentId: string, data: any) => {
  const response = await http.put(`/students/${studentId}/profile`, data);
  return response.data;
};

export const uploadStudentCV = async (studentId: string, file: File) => {
  const formData = new FormData();
  formData.append('cv', file);
  const response = await http.post(`/students/${studentId}/upload-cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadStudentPhoto = async (studentId: string, file: File) => {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await http.post(`/students/${studentId}/upload-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getStudentProposals = async (studentId: string) => {
  const response = await http.get(`/students/${studentId}/proposals`);
  return response.data;
};

export const getInterviews = async (status?: string) => {
  const response = await http.get(API.admin.interviews, {
    params: status ? { status } : undefined,
  });
  return response.data;
};

export const reviewInterview = async (interviewId: string, payload: any) => {
  const response = await http.post(API.admin.evaluate(interviewId), payload);
  return response.data;
};

export const getInterviewById = async (interviewId: string) => {
  const response = await http.get(API.admin.interviewById(interviewId));
  return response.data;
};

export const getAdminUsers = async () => {
  const response = await http.get(API.admin.users);
  return response.data;
};

export const deleteAdminUser = async (userId: string) => {
  const response = await http.delete(API.admin.deleteUser(userId));
  return response.data;
};

export const getAdminJobs = async () => {
  const response = await http.get(API.admin.jobs);
  return response.data;
};

export const deleteAdminJob = async (jobId: string) => {
  const response = await http.delete(API.admin.deleteJob(jobId));
  return response.data;
};

export const createSkill = async (payload: { name: string; description: string }) => {
  const response = await http.post(API.admin.skills, payload);
  return response.data;
};
export const deleteSkill = async (skillId: string) => {
  const response = await http.delete(`/skills/${skillId}`);
  return response.data;
};
export const fetchJobs = getJobs;
export const getJobListings = getJobs;
export const getProposals = getClientProposals;
export const getMyInterviewSessions = async () => {
  const response = await http.get('/interviews/my/sessions');
  return response.data;
};
export default http;
