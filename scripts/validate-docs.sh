#!/bin/bash
set -euo pipefail

# HORUS Documentation Validation Script
# Detects: ghost links, orphan pages, missing frontmatter, missing index pages, sidebar-nav sync issues

cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ISSUES=""

check_pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
check_fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); ISSUES="$ISSUES\n  - $1"; }

echo "=== HORUS Documentation Validation ==="
echo ""

# --- Extract hrefs ---
SIDEBAR_HREFS=$(grep -oP 'href:\s*"([^"]+)"' components/DocsSidebar.tsx | sed 's/href: "//;s/"$//' | sort -u)
NAV_HREFS=$(grep -oP 'href:\s*"([^"]+)"' components/PrevNextNav.tsx | sed 's/href: "//;s/"$//' | sort -u)
DISK_HREFS=$(find content/docs -name '*.mdx' | sed 's|content/docs||;s|/index\.mdx$||;s|\.mdx$||' | sort -u)

# --- Check 1: Ghost links in DocsSidebar ---
echo "[CHECK 1] Ghost Links in DocsSidebar"
GHOST_COUNT=0
while IFS= read -r href; do
  f="content/docs${href}.mdx"
  d="content/docs${href}/index.mdx"
  if [ ! -f "$f" ] && [ ! -f "$d" ]; then
    echo "    GHOST: $href"
    GHOST_COUNT=$((GHOST_COUNT + 1))
  fi
done <<< "$SIDEBAR_HREFS"
[ "$GHOST_COUNT" -eq 0 ] && check_pass "0 ghost links in DocsSidebar" || check_fail "$GHOST_COUNT ghost link(s) in DocsSidebar"

# --- Check 2: Ghost links in PrevNextNav ---
echo "[CHECK 2] Ghost Links in PrevNextNav"
GHOST_COUNT=0
while IFS= read -r href; do
  f="content/docs${href}.mdx"
  d="content/docs${href}/index.mdx"
  if [ ! -f "$f" ] && [ ! -f "$d" ]; then
    echo "    GHOST: $href"
    GHOST_COUNT=$((GHOST_COUNT + 1))
  fi
done <<< "$NAV_HREFS"
[ "$GHOST_COUNT" -eq 0 ] && check_pass "0 ghost links in PrevNextNav" || check_fail "$GHOST_COUNT ghost link(s) in PrevNextNav"

# --- Check 3: Orphan pages (on disk but not in sidebar or nav) ---
echo "[CHECK 3] Orphan Pages"
ORPHAN_COUNT=0
while IFS= read -r href; do
  if ! echo "$SIDEBAR_HREFS" | grep -qxF "$href" && ! echo "$NAV_HREFS" | grep -qxF "$href"; then
    echo "    ORPHAN: $href"
    ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
  fi
done <<< "$DISK_HREFS"
[ "$ORPHAN_COUNT" -eq 0 ] && check_pass "0 orphan pages" || check_fail "$ORPHAN_COUNT orphan page(s) not linked from navigation"

# --- Check 4: Missing frontmatter ---
echo "[CHECK 4] Missing Frontmatter"
MISSING_FM=0
while IFS= read -r file; do
  if ! head -1 "$file" | grep -q '^---'; then
    echo "    NO FRONTMATTER: $file"
    MISSING_FM=$((MISSING_FM + 1))
  elif ! head -10 "$file" | grep -q 'title:'; then
    echo "    NO TITLE: $file"
    MISSING_FM=$((MISSING_FM + 1))
  fi
done < <(find content/docs -name '*.mdx')
[ "$MISSING_FM" -eq 0 ] && check_pass "All pages have frontmatter with title" || check_fail "$MISSING_FM page(s) missing frontmatter"

# --- Check 5: Missing index pages ---
echo "[CHECK 5] Missing Index Pages"
MISSING_IDX=0
for dir in content/docs/*/; do
  dirname=$(basename "$dir")
  # Skip if directory has no .mdx children (just subdirs)
  mdx_count=$(find "$dir" -maxdepth 1 -name '*.mdx' ! -name 'index.mdx' | wc -l)
  if [ "$mdx_count" -gt 0 ] && [ ! -f "${dir}index.mdx" ]; then
    echo "    MISSING INDEX: $dir"
    MISSING_IDX=$((MISSING_IDX + 1))
  fi
done
[ "$MISSING_IDX" -eq 0 ] && check_pass "All sections have index.mdx" || check_fail "$MISSING_IDX section(s) missing index.mdx"

# --- Check 6: Sidebar-Nav sync ---
echo "[CHECK 6] Sidebar-Nav Sync"
SIDEBAR_ONLY=$(comm -23 <(echo "$SIDEBAR_HREFS") <(echo "$NAV_HREFS") | wc -l)
NAV_ONLY=$(comm -13 <(echo "$SIDEBAR_HREFS") <(echo "$NAV_HREFS") | wc -l)
SYNC_ISSUES=$((SIDEBAR_ONLY + NAV_ONLY))
if [ "$SYNC_ISSUES" -gt 0 ]; then
  [ "$SIDEBAR_ONLY" -gt 0 ] && echo "    $SIDEBAR_ONLY page(s) in sidebar but not nav"
  [ "$NAV_ONLY" -gt 0 ] && echo "    $NAV_ONLY page(s) in nav but not sidebar"
  check_fail "$SYNC_ISSUES sidebar-nav sync issue(s)"
else
  check_pass "Sidebar and PrevNextNav fully synced"
fi

# --- Summary ---
echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo -e "\nIssues:$ISSUES"
  exit 1
fi
exit 0
