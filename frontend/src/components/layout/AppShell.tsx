import * as React from 'react';

import { MobileNav } from './MobileNav';
import { TopNav } from './TopNav';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50 text-ink-900 dark:bg-ink-dark-bg dark:text-ink-dark-text">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 md:pb-10 md:pt-[30px]">
        <div className="page-container">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};
