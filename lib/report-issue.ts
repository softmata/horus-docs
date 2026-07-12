// Shared helper: open a pre-filled GitHub issue for a docs problem.
// Static site, no backend — GitHub's issues/new?title=&body=&labels= URL creates
// the issue in the repo when the reader submits.

// All docs issues are filed against the main horus repo.
const ISSUE_REPO = "softmata/horus";

// Cap embedded snippets so the pre-fill URL stays within GitHub's length limits.
const MAX_SNIPPET_CHARS = 1500;

interface OpenIssueOptions {
  /** Page title (falls back to the article H1 / document title). */
  pageTitle?: string;
  /** A specific code block being reported. */
  snippet?: { code: string; language: string };
}

/** Find the section the reader is currently on (nearest h2/h3 above the nav). */
function currentSection(): { section: string; anchor: string } {
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
  return { section, anchor };
}

export function openDocsIssue(opts: OpenIssueOptions = {}): void {
  const pageTitle =
    opts.pageTitle ||
    document.querySelector("article h1")?.textContent?.trim() ||
    document.title.split("|")[0].trim() ||
    "this page";

  const { section, anchor } = currentSection();
  const url = `${window.location.origin}${window.location.pathname}${anchor}`;
  const title = section
    ? `[Docs] ${pageTitle} — ${section}`
    : `[Docs] ${pageTitle}`;

  const lines: string[] = [
    `**Page:** [${pageTitle}](${url})`,
    section ? `**Section:** ${section}` : "",
    "",
  ];

  if (opts.snippet) {
    const lang = opts.snippet.language === "text" ? "" : opts.snippet.language;
    let code = opts.snippet.code.trim();
    if (code.length > MAX_SNIPPET_CHARS) {
      code = code.slice(0, MAX_SNIPPET_CHARS) + "\n... (truncated)";
    }
    lines.push(
      `**Reported code block** (${opts.snippet.language}):`,
      "",
      "```" + lang,
      code,
      "```",
      ""
    );
  }

  lines.push(
    "**What kind of issue is it?** (check all that apply)",
    "- [ ] A code snippet is wrong / doesn't compile or run",
    "- [ ] A CLI command or flag is incorrect",
    "- [ ] The documentation text is inaccurate or unclear",
    "- [ ] A link is broken or points to the wrong place",
    "- [ ] Something else",
    "",
    "**What's wrong?**",
    "",
    "**What did you expect instead?**",
    "",
    "---",
    `<sub>Reported from ${url}</sub>`
  );

  const issueUrl =
    `https://github.com/${ISSUE_REPO}/issues/new` +
    `?title=${encodeURIComponent(title)}` +
    `&body=${encodeURIComponent(lines.join("\n"))}` +
    `&labels=${encodeURIComponent("documentation")}`;

  window.open(issueUrl, "_blank", "noopener,noreferrer");
}
