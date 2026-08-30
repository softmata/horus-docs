#!/usr/bin/env python3
"""Check the Python documentation samples against the real horus_py surface.

Why this exists
---------------
`verify:python` runs `python -m py_compile`, which proves a block is valid
Python and nothing else. A sample could call `horus.Tensr()`, pass
`Node(freq=100)`, or import a class that was never exported, and every one of
those passes a syntax check. The Rust samples are compiled and the C++ samples
are type-checked; the Python ones had no equivalent, which made them the
weakest-checked surface in the documentation.

This reads the real surface out of `horus_py/` — `horus/__init__.py` for the
wrapper layer and `horus/_horus.pyi` for the native one — and walks the AST of
every Python fence against it.

What it checks
--------------
  1. `from horus import X` names something horus actually exports.
  2. `horus.X` is an attribute that exists.
  3. Keyword arguments to the constructors and functions whose signatures we can
     read (`Node`, `Scheduler`, `run`, `Topic`, `Sub`, `Pub`, `Rate`, ...) are
     parameters those callables accept.

What it deliberately does not check
-----------------------------------
Method calls on a value (`node.send(...)`), because the receiver's type is not
knowable from the AST without inference, and guessing produces false failures on
a reader's own objects. Names the documentation itself defines — a tutorial that
writes a `WeatherData` class and tells the reader to rebuild the bindings — are
resolved from the block, not from horus.

Run: python3 scripts/verify_python_api.py [--verbose] [--filter REGEX]
Exit status is 1 on a violation, so CI can gate on it.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def load_surface(horus_path: str):
    """Names horus exports, and signatures for the callables we can read."""
    pkg = os.path.join(horus_path, "horus_py", "horus")
    init_py = os.path.join(pkg, "__init__.py")
    pyi = os.path.join(pkg, "_horus.pyi")
    if not os.path.isfile(init_py):
        sys.exit(f"horus_py package not found at {pkg}")

    names: set[str] = set()
    sigs: dict[str, dict] = {}

    src = open(init_py, encoding="utf8").read()
    tree = ast.parse(src)

    def params_of(fn: ast.AST):
        a = fn.args
        ordered = [p.arg for p in a.posonlyargs + a.args + a.kwonlyargs]
        return {
            "params": [p for p in ordered if p != "self"],
            "kwargs": a.kwarg is not None,
        }

    # Walk, not iterate: the native imports sit inside a try/except at module
    # scope, and they are still module-level bindings.
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in ("_horus", "horus._horus"):
            for alias in node.names:
                names.add(alias.asname or alias.name)
        elif isinstance(node, ast.ImportFrom) and node.level and node.module:
            names.add(node.module.split(".")[0])
        elif isinstance(node, ast.Import):
            for alias in node.names:
                names.add((alias.asname or alias.name).split(".")[0])

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            names.add(node.name)
            sigs[node.name] = {"params": [], "kwargs": True}
            for sub in node.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if sub.name == "__init__":
                        sigs[node.name] = params_of(sub)
                    else:
                        sigs[f"{node.name}.{sub.name}"] = params_of(sub)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            names.add(node.name)
            sigs[node.name] = params_of(node)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    names.add(t.id)

    # __all__ and every __all__.extend([...]) — the message types are added that
    # way, conditionally, and they are a real part of the surface.
    for m in re.finditer(r"__all__\s*(?:=|\.extend\()\s*\[(.*?)\]", src, re.S):
        names |= set(re.findall(r"[\"']([A-Za-z_]\w*)[\"']", m.group(1)))

    if os.path.isfile(pyi):
        for node in ast.parse(open(pyi, encoding="utf8").read()).body:
            if isinstance(node, ast.ClassDef):
                names.add(node.name)
                for sub in node.body:
                    if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)) and sub.name == "__init__":
                        sigs.setdefault(node.name, params_of(sub))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                names.add(node.name)
                sigs.setdefault(node.name, params_of(node))

    for entry in os.listdir(pkg):
        if entry.endswith(".py") and entry != "__init__.py":
            names.add(entry[:-3])
        elif os.path.isdir(os.path.join(pkg, entry)) and not entry.startswith("__"):
            names.add(entry)

    names = {n for n in names if not n.startswith("_")}
    return names, sigs


# Types the documentation teaches the reader to create, which therefore do not
# exist in horus_py until they follow the steps. Tutorial 4 writes a
# `WeatherData` message, adds it to `__all__` and rebuilds the bindings with
# maturin; from that point `from horus import WeatherData` is correct, and the
# page says so. Anything added here needs to be a type the docs generate, not a
# type the docs got wrong.
READER_GENERATED = {"WeatherData"}


def defined_in_block(tree: ast.AST) -> set[str]:
    """Names the sample binds itself, which are not horus's to provide."""
    out: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            out.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    out.add(t.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            # `from horus import X` must not count as defining X — that is the
            # very claim being checked. Every other import does bind a name the
            # sample then legitimately uses.
            if isinstance(node, ast.ImportFrom) and node.module == "horus":
                continue
            for alias in node.names:
                out.add((alias.asname or alias.name).split(".")[0])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--horus-path", default="../horus")
    ap.add_argument("--filter")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    extracted = os.path.join(ROOT, "extracted-code-blocks.json")
    if not os.path.isfile(extracted):
        sys.exit("extracted-code-blocks.json is missing. Run `npm run extract:code` first.")

    horus_path = os.path.abspath(os.path.join(ROOT, args.horus_path))
    names, sigs = load_surface(horus_path)
    if len(names) < 50:
        sys.exit(f"only {len(names)} horus names found — the surface read is broken")

    blocks = [b for b in json.load(open(extracted))["blocks"] if b["language"] == "python"]
    if args.filter:
        rx = re.compile(args.filter)
        blocks = [b for b in blocks if rx.search(b["id"])]

    problems: list[str] = []
    checked = unparsed = 0

    for block in blocks:
        code = block["code"]
        try:
            tree = ast.parse(code)
        except SyntaxError:
            # Fragments written as the body of a function, and the like. The
            # syntax half is verify-python-local.mjs's job, not this one's.
            unparsed += 1
            continue
        checked += 1
        local = defined_in_block(tree)
        where = block["id"]

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == "horus":
                for alias in node.names:
                    if (
                        alias.name != "*"
                        and alias.name not in names
                        and alias.name not in local
                        and alias.name not in READER_GENERATED
                    ):
                        problems.append(f"{where}: `from horus import {alias.name}` — horus exports no {alias.name}")
            elif isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == "horus":
                if node.attr not in names and node.attr not in local and node.attr not in READER_GENERATED:
                    problems.append(f"{where}: `horus.{node.attr}` does not exist")
            elif isinstance(node, ast.Call):
                fn = node.func
                target = None
                if isinstance(fn, ast.Name) and fn.id in sigs and fn.id not in local:
                    target = fn.id
                elif (
                    isinstance(fn, ast.Attribute)
                    and isinstance(fn.value, ast.Name)
                    and fn.value.id == "horus"
                    and fn.attr in sigs
                ):
                    target = fn.attr
                if not target:
                    continue
                sig = sigs[target]
                if sig["kwargs"]:
                    continue
                allowed = set(sig["params"])
                for kw in node.keywords:
                    if kw.arg and kw.arg not in allowed:
                        problems.append(
                            f"{where}: `{target}(..., {kw.arg}=...)` — not a parameter of {target}"
                            f" ({', '.join(sig['params'])})"
                        )

    if args.verbose:
        print(f"surface: {len(names)} names, {len(sigs)} readable signatures")

    if not args.filter and checked < 100:
        print(f"only {checked} Python blocks examined — the selection is broken", file=sys.stderr)
        return 2

    if problems:
        print(f"{len(problems)} Python API problem(s):\n", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        return 1

    print(
        f"Python API verification: {checked}/{checked} blocks use only real horus names"
        f" ({unparsed} skipped as unparseable fragments)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
