import React from 'react';

const Footer: React.FC = () => (
  <footer className="border-t border-ink-100 bg-white dark:border-ink-dark-border dark:bg-ink-dark-surface">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-6 text-center text-sm text-ink-500 dark:text-ink-dark-muted md:flex-row md:justify-between md:text-left">
      <p>
        © {new Date().getFullYear()}{' '}
        <span className="font-semibold text-ink-700 dark:text-ink-200">Shaghalny</span>. All
        rights reserved.
      </p>

      <div className="flex items-center gap-6">
        <a
          href="/terms"
          className="font-medium text-ink-600 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          Terms of Service
        </a>
        <a
          href="/privacy"
          className="font-medium text-ink-600 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          Privacy Policy
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
