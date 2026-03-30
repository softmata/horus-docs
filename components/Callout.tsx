'use client';

import React from 'react';

interface CalloutProps {
  type?: 'info' | 'note' | 'warning' | 'danger' | 'tip';
  title?: string;
  children: React.ReactNode;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
  info: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-500/50',
    icon: 'ℹ️',
    iconColor: 'text-blue-400',
  },
  note: {
    bg: 'bg-purple-900/20',
    border: 'border-purple-500/50',
    icon: '📝',
    iconColor: 'text-purple-400',
  },
  warning: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500/50',
    icon: '⚠️',
    iconColor: 'text-yellow-400',
  },
  danger: {
    bg: 'bg-red-900/20',
    border: 'border-red-500/50',
    icon: '🚨',
    iconColor: 'text-red-400',
  },
  tip: {
    bg: 'bg-green-900/20',
    border: 'border-green-500/50',
    icon: '💡',
    iconColor: 'text-green-400',
  },
};

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = typeStyles[type] || typeStyles.info;

  return (
    <div
      className={`my-6 rounded-lg border-l-4 p-4 ${styles.bg} ${styles.border}`}
    >
      {title && (
        <div className={`flex items-center gap-2 font-semibold mb-2 ${styles.iconColor}`}>
          <span>{styles.icon}</span>
          <span>{title}</span>
        </div>
      )}
      <div className="text-gray-300 prose-p:my-2 prose-p:text-gray-300">
        {children}
      </div>
    </div>
  );
}
