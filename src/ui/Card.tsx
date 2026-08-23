import type { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bordered content container shared across all feature panels. */
export function Card({ title, actions, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-lg border border-brand-200 bg-white p-4 shadow-sm ${className}`}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-brand-900">{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
