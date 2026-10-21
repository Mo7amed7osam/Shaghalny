import React from 'react';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/auth/AuthProvider';
import { AppRouter } from '@/app/router';
import { PwaLifecycle } from '@/components/pwa/PwaLifecycle';

const App: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <PwaLifecycle />
        <AppRouter />
      </AuthProvider>
    </MotionConfig>
  );
};

export default App;
