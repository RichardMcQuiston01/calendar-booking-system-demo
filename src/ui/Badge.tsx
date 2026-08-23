import type { ReactNode } from 'react';

export type BadgeTone = 'own' | 'inherited' | 'rolled-up' | 'neutral' | 'success' | 'danger' | 'warning';

const TONE_CLASSES: Record<BadgeTone, string> = {
  own: 'bg-brand-100 text-brand-800',
  inherited: 'bg-sky-100 text-sky-800',
  'rolled-up': 'bg-violet-100 text-violet-800',
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** Small pill label. Tones map 1:1 to `ViewItem.source` plus generic states. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
