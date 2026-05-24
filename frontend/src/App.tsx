import React from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { AppRouter } from '@/app/router';
import { PwaLifecycle } from '@/components/pwa/PwaLifecycle';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PwaLifecycle />
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
