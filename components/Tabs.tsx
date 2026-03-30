'use client';

import React, { useState, useEffect } from 'react';

interface TabsProps {
  items: string[];
  children: React.ReactNode;
  defaultValue?: string;
  storageKey?: string;
}

interface TabProps {
  value: string;
  children: React.ReactNode;
}

export function Tab({ children }: TabProps) {
  return <div>{children}</div>;
}

export default function Tabs({ items, children, defaultValue, storageKey = 'horus-docs-lang' }: TabsProps) {
  const [active, setActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && items.includes(stored)) return stored;
    }
    return defaultValue || items[0];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, active);
  }, [active, storageKey]);

  const childArray = React.Children.toArray(children);
  const activeTab = childArray.find(
    (child): child is React.ReactElement<TabProps> =>
      React.isValidElement(child) && (child as any).props.value === active
  );

  return (
    <div className="my-6 rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="flex border-b border-[var(--border)] bg-[var(--surface)]">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              active === item
                ? 'text-[var(--text)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4">{activeTab}</div>
    </div>
  );
}
