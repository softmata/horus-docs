/**
 * Serialize data for embedding inside a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone does NOT escape `<`, so a value containing `</script>`
 * (e.g. from a page title or description) could break out of the script tag and
 * inject markup. Escaping the HTML-sensitive characters to their `\uXXXX` forms
 * neutralizes that while keeping the JSON valid. (JSON-LD is parsed as JSON, not
 * executed, so U+2028/U+2029 escaping isn't needed here.)
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
