#!/usr/bin/env python3
"""Every shell block must be shell, and must parse.

Why this exists
---------------
592 of the site's roughly 2,000 fenced blocks are ```bash, and nothing looked at
any of them. `docs_cli_contract` checks that a documented command and its flags
exist; it does not open the fence. The three compile checks cover Rust, C++ and
Python and stop there.

That gap hid a specific and repeatable mistake: a block tagged ```bash that is
not shell. Three carried a line of Rust or Python appended to a shell recipe
under a "# Or from code" comment, and three more were sample output. Both shapes
cost something real. A reader who pastes the block gets a syntax error from
their shell, and -- worse -- a Rust line inside a ```bash fence is invisible to
`verify:rust`, so it is the one snippet on the page nothing compiles.

What it checks
--------------
Every ```bash block parses under `bash -n`, after two normalisations that
reflect how the documentation is actually written:

  * `<placeholder>` becomes `placeholder`. Angle brackets are the house
    convention for "put your value here" and are not redirection.
  * Blocks that are sample output rather than commands are skipped. The test is
    the block's own shape -- mostly indented lines, numbered lines, or the
    `Usage:` / `Options:` headings a CLI prints -- not a list of file:line pairs
    that someone has to remember to update.

`bash -n` parses without executing. Nothing in a documented recipe runs here.

What it does not check: whether a recipe does what the prose claims. Several of
those were found by hand -- an install that lands somewhere the next command
does not search, a build that silently refuses more than one file -- and finding
them needs a fixture project, not a parser.

Run: python3 scripts/check_shell_fences.py [--verbose]
Exit status is 1 on a violation, so CI can gate on it.
"""
import os
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERBOSE = "--verbose" in sys.argv

FENCE = re.compile(r"^```bash[^\n]*\n(.*?)^```", re.M | re.S)
PLACEHOLDER = re.compile(r"<([A-Za-z0-9_.\-|]+)>")
# A line that reads like printed output rather than a command.
OUTPUT_LINE = re.compile(r"^(\s+\S|\d+\.\s|Usage:|Options:|Arguments:|Commands:|[A-Z][a-z]+:)")


def is_output(body: str) -> bool:
    lines = [l for l in body.splitlines() if l.strip() and not l.strip().startswith("#")]
    if not lines:
        return True
    return sum(1 for l in lines if OUTPUT_LINE.match(l)) / len(lines) > 0.5


def main() -> int:
    failures, checked, skipped = [], 0, 0
    for path in sorted((ROOT / "content" / "docs").rglob("*.mdx")):
        text = path.read_text()
        for m in FENCE.finditer(text):
            body = m.group(1)
            line = text[: m.start()].count("\n") + 1
            rel = path.relative_to(ROOT)
            if is_output(body):
                skipped += 1
                if VERBOSE:
                    print(f"  skip  {rel}:{line} (sample output, not commands)")
                continue
            checked += 1
            script = PLACEHOLDER.sub(r"\1", body)
            with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as fh:
                fh.write(script)
                tmp = fh.name
            try:
                r = subprocess.run(["bash", "-n", tmp], capture_output=True, text=True, timeout=20)
            finally:
                os.unlink(tmp)
            if r.returncode != 0:
                detail = (r.stderr.strip().splitlines() or ["(no detail)"])[-1]
                detail = re.sub(r"^\S*\.sh: ", "", detail)
                failures.append(f"{rel}:{line}: not valid shell -- {detail}")
            elif VERBOSE:
                print(f"  ok    {rel}:{line}")

    print(f"Checked {checked} shell block(s); {skipped} skipped as sample output.")

    if failures:
        print(f"\n{len(failures)} shell block(s) do not parse:\n")
        for f in failures:
            print(f"  {f}")
        print("\nIf the block is not shell, tag the fence with the language it is in --")
        print("a Rust line inside a ```bash fence is the one snippet on the page that")
        print("verify:rust never compiles. If it is printed output, tag it ```text.")
        return 1

    if checked == 0:
        print("\nNo shell blocks found at all. Either they were removed, or this check no")
        print("longer sees the content it was written to guard.")
        return 1

    print("Every shell block parses.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
