'use client';

import React, { useState } from 'react';
import { FiChevronRight, FiChevronDown } from 'react-icons/fi';

interface DetailsProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Details({ title, children, defaultOpen = false }: DetailsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="my-4 rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm font-medium bg-[var(--surface)] text-[var(--text)] hover:opacity-90 transition-opacity"
      >
        {isOpen ? (
          <FiChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <FiChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
        {title}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}
