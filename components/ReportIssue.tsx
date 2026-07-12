"use client";

import { usePathname } from "next/navigation";
import { FiAlertCircle } from "react-icons/fi";

// Doc issues are filed against the docs repo (where the fix lands).
const ISSUE_REPO = "softmata/horus-docs";

interface ReportIssueProps {
  /** Frontmatter title of the current page. */
  pageTitle: string;
}

/**
 * Per-page "Report an issue" button. Opens a pre-filled GitHub issue in the
 * docs repo — no backend needed. Auto-captures the page URL and the section the
 * reader is currently viewing, plus a checklist so the reporter tags what's
 * wrong (code snippet, CLI command, docs text, link). Submitting on GitHub
 * creates the issue directly in the repo.
 */
export function ReportIssue({ pageTitle }: ReportIssueProps) {
  const pathname = usePathname();

  const handleClick = () => {
    // Find the section the reader is currently on: the last h2/h3 whose top has
    // scrolled above the sticky nav (~140px). Falls back to page-level.
    let section = "";
    let anchor = "";
    const article = document.querySelector("article");
    if (article) {
      const headings = Array.from(
        article.querySelectorAll("h2, h3")
      ) as HTMLElement[];
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= 140) {
          section = h.textContent?.trim() || "";
          anchor = h.id ? `#${h.id}` : "";
        } else {
          break;
        }
      }
    }

    const url = `${window.location.origin}${pathname}${anchor}`;
    const title = section
      ? `[Docs] ${pageTitle} — ${section}`
      : `[Docs] ${pageTitle}`;

    const body = [
      `**Page:** [${pageTitle}](${url})`,
      section ? `**Section:** ${section}` : "",
      "",
      "**What kind of issue is it?** (check all that apply)",
      "- [ ] A code snippet is wrong / doesn't compile or run",
      "- [ ] A CLI command or flag is incorrect",
      "- [ ] The documentation text is inaccurate or unclear",
      "- [ ] A link is broken or points to the wrong place",
      "- [ ] Something else",
      "",
      "**What's wrong?**",
      "",
      "<!-- Paste the exact snippet / command / sentence if you can -->",
      "",
      "**What did you expect instead?**",
      "",
      "",
      "---",
      `<sub>Reported from ${url}</sub>`,
    ].join("\n");

    const issueUrl =
      `https://github.com/${ISSUE_REPO}/issues/new` +
      `?title=${encodeURIComponent(title)}` +
      `&body=${encodeURIComponent(body)}` +
      `&labels=${encodeURIComponent("documentation")}`;

    window.open(issueUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-8 flex items-center justify-between gap-4 flex-wrap text-sm">
      <span className="text-[var(--text-tertiary)]">
        Spotted an error on this page?
      </span>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-3 py-2 font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
        aria-label="Report an issue with this page on GitHub"
      >
        <FiAlertCircle className="w-4 h-4" />
        Report an issue
      </button>
    </div>
  );
}
