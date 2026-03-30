/**
 * Code block wrapper templates for verification.
 *
 * Shared between verify-rust-local.mjs and verify-python-local.mjs.
 * Provides functions to wrap incomplete code snippets into compilable/runnable programs.
 */

// ─── Rust Wrappers ───────────────────────────────────────────────────────────

/**
 * Check if Rust code already has `use horus::prelude::*;` or similar.
 */
export function rustHasHorusImport(code) {
  return /use\s+horus(::|::prelude)/.test(code);
}

/**
 * Check if Rust code has a fn main().
 */
export function rustHasMainFn(code) {
  return /fn\s+main\s*\(/.test(code);
}

/**
 * Check if Rust code is a top-level definition (struct/impl/mod/trait/node!/message!).
 */
export function rustIsTopLevelDefinition(code) {
  if (/^(pub\s+)?(struct|enum|type|trait|const|static|mod)\s+/m.test(code)) return true;
  if (/^(pub\s+)?impl\s+/m.test(code)) return true;
  if (/node!\s*\{/.test(code)) return true;
  if (/message!\s*\{/.test(code)) return true;
  if (/service!\s*\{/.test(code) || /action!\s*\{/.test(code)) return true;
  if (/standard_action!\s*\(/.test(code)) return true;
  if (/\#\[test\]/.test(code)) return true;
  if (/^(pub\s+)?fn\s+\w+/.test(code)) return true;
  return false;
}

/**
 * Check if Rust code uses the ? operator without a fn returning Result.
 */
export function rustUsesTryOperator(code) {
  return /\?\s*[;\n}]/.test(code) && !rustHasMainFn(code);
}

/**
 * Wrap a Rust code snippet so it can compile.
 *
 * Templates:
 *   1. prelude_wrapper — adds `use horus::prelude::*;` if missing
 *   2. main_wrapper — wraps code in `fn main() { ... }`
 *   3. result_main_wrapper — wraps in `fn main() -> Result<()> { ... Ok(()) }`
 *   4. top_level_wrapper — adds dummy `fn main() {}` after struct/impl definitions
 *   5. test_wrapper — preserves #[test] functions, adds main stub
 *
 * @param {string} code - Raw Rust code from docs
 * @param {string[]} flags - Flags from extract-code-blocks.mjs
 * @returns {string|null} Wrapped code or null if cannot be wrapped
 */
export function wrapRustCode(code, flags = []) {
  const suppressions = '#![allow(unused_imports, dead_code, unused_variables, unused_mut)]\n';
  let wrapped = code;

  // Add horus prelude if missing
  const needsPrelude = !rustHasHorusImport(wrapped);

  if (rustHasMainFn(wrapped)) {
    // Template 1: prelude_wrapper — code already has main, just add prelude
    return suppressions +
      (needsPrelude ? 'use horus::prelude::*;\n\n' : '') +
      wrapped;
  }

  if (rustIsTopLevelDefinition(code)) {
    // Template 4: top_level_wrapper — struct/impl/macro at top level, add dummy main
    return suppressions +
      (needsPrelude ? 'use horus::prelude::*;\n\n' : '') +
      wrapped +
      '\n\nfn main() {}\n';
  }

  // Separate use-lines from body
  const useLines = code.split('\n').filter(l => l.trim().startsWith('use '));
  const bodyLines = code.split('\n').filter(l => !l.trim().startsWith('use '));

  if (rustUsesTryOperator(code)) {
    // Template 3: result_main_wrapper — wrap in fn main() -> Result<()>
    let result = suppressions;
    if (needsPrelude) result += 'use horus::prelude::*;\n';
    if (useLines.length > 0) result += useLines.join('\n') + '\n';
    result += `\nfn main() -> Result<()> {\n    ${bodyLines.join('\n    ')}\n    Ok(())\n}\n`;
    return result;
  }

  // Template 2: main_wrapper — wrap in fn main() { ... }
  let result = suppressions;
  if (needsPrelude) result += 'use horus::prelude::*;\n';
  if (useLines.length > 0) result += useLines.join('\n') + '\n';
  result += `\nfn main() {\n    ${bodyLines.join('\n    ')}\n}\n`;
  return result;
}

// ─── Python Wrappers ─────────────────────────────────────────────────────────

/**
 * Check if Python code imports horus.
 */
export function pythonUsesHorus(code) {
  return /(?:^|\n)\s*(?:import\s+horus|from\s+horus\s+import)/.test(code);
}

/**
 * Add `import horus` if missing from Python code.
 * Returns the code with import added if needed.
 */
export function wrapPythonCode(code) {
  if (pythonUsesHorus(code)) return code;

  // Check if code references horus at all
  if (/horus\./.test(code)) {
    return 'import horus\n\n' + code;
  }

  // No horus reference — return as-is
  return code;
}
