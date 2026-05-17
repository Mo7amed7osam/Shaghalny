import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import StudentDashboard from '@/components/student/StudentDashboard';
import StudentProfile from '@/components/student/StudentProfile';
import StudentPublicProfile from '@/components/student/StudentPublicProfile';
import JobList from '@/components/student/JobList';
import SkillVerification from '@/components/student/SkillVerification';
import StudentContracts from '@/components/student/StudentContracts';
import StudentWallet from '@/components/student/StudentWallet';
import ClientDashboard from '@/components/client/ClientDashboard';
import PostJob from '@/components/client/PostJob';
import ViewProposals from '@/components/client/ViewProposals';
import ClientContracts from '@/components/client/ClientContracts';
import ClientWallet from '@/components/client/ClientWallet';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ReviewInterview from '@/components/admin/ReviewInterview';
import AdminPayments from '@/components/admin/AdminPayments';
import ProtectedRoute from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import ContractDetails from '@/components/contracts/ContractDetails';
import AIInterviewPage from '@/features/ai-interview/pages/AIInterviewPage';
import AIInterviewResultPage from '@/features/ai-interview/pages/AIInterviewResultPage';
import LandingPage from '@/components/marketing/LandingPage';
import AdminEvents from '@/components/events/AdminEvents';
import EventDetails from '@/components/events/EventDetails';
import EventsPage from '@/components/events/EventsPage';

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <StudentDashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <StudentProfile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute roles={['Student', 'Client', 'Admin']}>
            <AppShell>
              <StudentPublicProfile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/jobs"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <JobList />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/contracts"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <StudentContracts />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/skill-verification"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <SkillVerification />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/wallet"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <StudentWallet />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/ai-interview/:sessionId"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <AIInterviewPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/ai-interview/:sessionId/result"
        element={
          <ProtectedRoute roles={['Student']}>
            <AppShell>
              <AIInterviewResultPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute roles={['Client']}>
            <AppShell>
              <ClientDashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/post-job"
        element={
          <ProtectedRoute roles={['Client']}>
            <AppShell>
              <PostJob />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/view-proposals"
        element={
          <ProtectedRoute roles={['Client']}>
            <AppShell>
              <ViewProposals />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/wallet"
        element={
          <ProtectedRoute roles={['Client']}>
            <AppShell>
              <ClientWallet />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/contracts"
        element={
          <ProtectedRoute roles={['Client']}>
            <AppShell>
              <ClientContracts />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/contracts/:id"
        element={
          <ProtectedRoute roles={['Student', 'Client', 'Admin']}>
            <AppShell>
              <ContractDetails />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppShell>
              <AdminDashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/review-interview/:interviewId"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppShell>
              <ReviewInterview />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppShell>
              <AdminPayments />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/events" element={<ProtectedRoute roles={['Admin']}><AppShell><AdminEvents /></AppShell></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute roles={['Student', 'Client', 'Admin']}><AppShell><EventDetails /></AppShell></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute roles={['Student', 'Admin']}><AppShell><EventsPage /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
