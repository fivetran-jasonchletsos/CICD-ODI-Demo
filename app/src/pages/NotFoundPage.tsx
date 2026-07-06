import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-24 text-center">
      <div className="eyebrow mb-3">404</div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink-strong)' }}>Page not found</h1>
      <p className="mt-3 text-[14px]" style={{ color: 'var(--ink-muted)' }}>
        That route doesn't exist in CICD-ODI-Demo.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white"
        style={{ background: 'var(--terraform)' }}
      >
        Back to overview
      </Link>
    </div>
  );
}
