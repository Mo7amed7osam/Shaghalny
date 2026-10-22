export function DemoNotice() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  return (
    <aside aria-label="Demonstration environment" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium leading-5 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      Graduation project demo · Demo users, projects, reviews and payments are sample data; no real money is transferred. Opportunities marked “External listing” are real postings from their original source.
    </aside>
  );
}
