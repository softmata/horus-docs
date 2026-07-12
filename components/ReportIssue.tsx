"use client";

import { FiAlertCircle } from "react-icons/fi";
import { openDocsIssue } from "@/lib/report-issue";

interface ReportIssueProps {
  /** Frontmatter title of the current page. */
  pageTitle: string;
}

/**
 * Per-page "Report an issue" button. Opens a pre-filled GitHub issue in the
 * horus repo (no backend). Captures the page + the section the reader is on,
 * plus a checklist tagging what's wrong (code snippet, CLI, docs, link).
 */
export function ReportIssue({ pageTitle }: ReportIssueProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 flex-wrap text-sm">
      <span className="text-[var(--text-tertiary)]">
        Spotted an error on this page?
      </span>
      <button
        type="button"
        onClick={() => openDocsIssue({ pageTitle })}
        className="inline-flex items-center gap-2 px-3 py-2 font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
        aria-label="Report an issue with this page on GitHub"
      >
        <FiAlertCircle className="w-4 h-4" />
        Report an issue
      </button>
    </div>
  );
}
