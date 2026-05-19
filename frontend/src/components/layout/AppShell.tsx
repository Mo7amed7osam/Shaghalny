import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-dark-bg md:pl-64">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 pb-20 pt-6 md:pb-8">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
