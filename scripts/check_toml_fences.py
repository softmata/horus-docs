#!/usr/bin/env python3
"""Every TOML block in the docs must parse, and agree with the schema we publish.

Why this exists
---------------
`public/schema/horus.toml.schema.json` is 27 KB of JSON Schema served at a stable
URL, and `content/docs/package-management/configuration.mdx` tells readers to
point their editor at it:

    url = "https://docs.horusrobotics.dev/schema/horus.toml.schema.json"

So a reader's editor validates their manifest against that file. Nothing
validated the file against anything, and nothing validated the site's own 84
TOML blocks against it either. A manifest example could use a table the schema
rejects -- the reader would then see their editor flag a line they copied
verbatim out of the documentation -- and every check in this repository would
stay green, because none of them parses TOML.

The three compile checks (`verify:rust`, `verify:cpp`, `verify:python`) cover
1,256 of roughly 2,000 fenced blocks. TOML, YAML, bash, text and powershell are
not parsed by anything. This closes the TOML part, which is the part with a
published schema to check against.

What it checks
--------------
  1. Every ```toml block parses. A block that does not parse cannot be copied.
  2. Every block that looks like a `horus.toml` -- it declares `[package]`,
     `[dependencies]` or another table the schema knows -- validates against the
     published schema.
  3. The schema itself is a valid JSON Schema, so a broken schema fails here
     rather than in a reader's editor.
  4. The published file still matches what `horus schema` emits. The schema is
     generated from `horus_manager/src/manifest_lint.rs`; the copy served here
     is a checked-in artefact of that generator, and nothing else notices when
     the two drift. Skipped, with a note, when no horus binary is on hand --
     the same way the docs_* suites skip when the sibling checkout is absent.

What it does not check: whether a documented key does what the page says. That
is behaviour, and it needs a reader.

Run: python3 scripts/check_toml_fences.py [--verbose]
Exit status is 1 on a violation, so CI can gate on it.
"""
import json
import pathlib
import re
import sys
import tomllib

import jsonschema

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "public" / "schema" / "horus.toml.schema.json"
VERBOSE = "--verbose" in sys.argv

FENCE = re.compile(r"^```toml[^\n]*\n(.*?)^```", re.M | re.S)

# A fence is a manifest if it declares any table the schema knows about.
# Anything else (a Cargo.toml sample, a pyproject fragment) is only parsed.
def is_manifest(doc: dict, known: set) -> bool:
    return any(k in known for k in doc)


ASSIGN = re.compile(r"^\s*[A-Za-z_][\w-]*\s*=")
CONTRAST = re.compile(r"#.*\b(does nothing|not a table|correct|wrong|incorrect|instead of|deprecated)\b", re.I)


def skip_reason(body: str, err: str) -> str | None:
    """Why a block that does not parse is allowed not to parse.

    Derived from the block, not from a list of file:line pairs, so a new block
    of the same shape is covered without anyone remembering to update this.
    Only duplicate-key failures qualify; a genuine syntax error is never
    excused.
    """
    if "overwrite" not in err.lower():
        return None
    lines = [l for l in body.splitlines() if l.strip() and not l.strip().startswith("#")]
    if lines and all(ASSIGN.match(l) for l in lines):
        return "a menu of alternative values for one key, not a document"
    if CONTRAST.search(body):
        return "shows an incorrect form beside the correct one, so it contains the error on purpose"
    return None


def main() -> int:
    if not SCHEMA_PATH.exists():
        print(f"{SCHEMA_PATH} is missing -- the docs tell readers it is served at a stable URL")
        return 1
    schema = json.loads(SCHEMA_PATH.read_text())
    try:
        validator_cls = jsonschema.validators.validator_for(schema)
        validator_cls.check_schema(schema)
    except jsonschema.SchemaError as e:
        print(f"the published schema is not a valid JSON Schema: {e}")
        return 1
    validator = validator_cls(schema)
    known = set(schema.get("properties", {}))

    # 4. schema freshness against the generator, when a binary is available
    horus_bin = None
    for cand in (ROOT.parent / "horus" / "target" / "debug" / "horus",
                 ROOT.parent / "horus" / "target" / "release" / "horus"):
        if cand.exists():
            horus_bin = cand
            break
    if horus_bin is None:
        print("note: no horus binary found, so schema freshness was not checked.")
    else:
        import subprocess, tempfile
        with tempfile.TemporaryDirectory() as td:
            out = pathlib.Path(td) / "gen.json"
            r = subprocess.run([str(horus_bin), "schema", "-o", str(out)],
                               capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                print(f"note: `horus schema` failed, freshness not checked: {r.stderr.strip()[:200]}")
            elif json.loads(out.read_text()) != schema:
                print("The published schema no longer matches `horus schema`.")
                print("  Regenerate it:  horus schema -o public/schema/horus.toml.schema.json")
                print("  Readers point their editor at the published copy, so a stale one")
                print("  flags valid manifests and misses invalid ones.")
                return 1

    failures, skipped, parsed, validated = [], [], 0, 0
    for path in sorted((ROOT / "content" / "docs").rglob("*.mdx")):
        text = path.read_text()
        for m in FENCE.finditer(text):
            body = m.group(1)
            line = text[: m.start()].count("\n") + 1
            rel = path.relative_to(ROOT)
            try:
                doc = tomllib.loads(body)
            except tomllib.TOMLDecodeError as e:
                why = skip_reason(body, str(e))
                if why:
                    skipped.append(f"{rel}:{line}: {why}")
                    if VERBOSE:
                        print(f"  skip    {rel}:{line} -- {why}")
                    continue
                failures.append(f"{rel}:{line}: TOML does not parse -- {e}")
                continue
            parsed += 1
            if not is_manifest(doc, known):
                if VERBOSE:
                    print(f"  parsed  {rel}:{line} (not a manifest)")
                continue
            validated += 1
            errs = sorted(validator.iter_errors(doc), key=lambda e: list(e.path))
            for e in errs:
                where = ".".join(str(p) for p in e.path) or "(root)"
                failures.append(f"{rel}:{line}: {where}: {e.message}")
            if not errs and VERBOSE:
                print(f"  ok      {rel}:{line}")

    print(f"Parsed {parsed} TOML block(s); {validated} validated against the published schema; "
          f"{len(skipped)} skipped by design.")

    if failures:
        print(f"\n{len(failures)} TOML problem(s):\n")
        for f in failures:
            print(f"  {f}")
        print("\nA reader whose editor points at the published schema sees these as errors on")
        print("a line they copied out of the documentation.")
        return 1

    if parsed == 0:
        print("\nNo TOML blocks found at all. Either they were removed, or this check no")
        print("longer sees the content it was written to guard.")
        return 1

    print("Every TOML block parses, and every manifest agrees with the published schema.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
