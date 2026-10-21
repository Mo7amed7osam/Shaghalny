import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const pageNames: Record<string, string> = {
  '/': 'Student freelance marketplace',
  '/login': 'Sign in',
  '/register': 'Create account',
  '/student/dashboard': 'Student dashboard',
  '/student/profile': 'Student profile',
  '/student/jobs': 'Job board',
  '/student/contracts': 'Student contracts',
  '/student/skill-verification': 'Skill verification',
  '/student/career-roadmap': 'Career roadmap',
  '/student/interview-history': 'Interview history',
  '/student/wallet': 'Student wallet',
  '/client/dashboard': 'Client dashboard',
  '/client/post-job': 'Post a job',
  '/client/view-proposals': 'View proposals',
  '/client/wallet': 'Client wallet',
  '/client/contracts': 'Client contracts',
  '/admin/dashboard': 'Admin dashboard',
  '/admin/payments': 'Admin payments',
  '/admin/events': 'Manage events',
  '/events': 'Events',
};

export function RouteAccessibility() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const name = pageNames[pathname]
      || (pathname.startsWith('/students/') ? 'Student profile'
        : pathname.startsWith('/contracts/') ? 'Contract details'
        : pathname.startsWith('/events/') ? 'Event details'
        : pathname.startsWith('/admin/review-interview/') ? 'Review interview'
        : pathname.endsWith('/result') ? 'Interview result' : 'AI interview');
    document.title = `${name} | Shaghalny`;
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return <a className="skip-link" href="#main-content">Skip to main content</a>;
}
