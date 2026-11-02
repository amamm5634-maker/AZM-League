import type { ReactNode } from 'react';

export function Loading({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton sk-hero" />
      <div className="skeleton sk-row" />
      <div className="skeleton sk-row" />
      <div className="skeleton sk-row" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card state-box">
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-dark" style={{ marginTop: 10 }} onClick={onRetry}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function PageHead({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
