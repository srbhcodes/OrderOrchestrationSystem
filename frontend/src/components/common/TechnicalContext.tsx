/**
 * Progressive disclosure: technical explanation in a collapsible panel.
 * Secondary/deep layer so primary layer stays execution-focused.
 */
import { useState } from 'react';

export function TechnicalContext({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-100/80"
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-600">{children}</div>}
    </div>
  );
}
