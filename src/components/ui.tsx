import React from 'react';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-zen-border bg-zen-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-medium tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zen-border px-4 py-10 text-center text-sm text-zen-muted">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zen-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-zen-border bg-zen-bg px-3 py-2.5 text-zen-text outline-none transition-colors focus:border-zen-accent focus:bg-zen-card';

export const buttonPrimary =
  'rounded-xl bg-zen-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-zen-accent/90 disabled:cursor-not-allowed disabled:opacity-40';

export const buttonGhost =
  'rounded-xl border border-zen-border bg-zen-card px-3 py-2 text-sm text-zen-muted transition-colors hover:text-zen-text';
