/**
 * Cloudflare Web Analytics beacon (privacy-friendly, free).
 *
 * Renders only when NEXT_PUBLIC_CF_ANALYTICS_TOKEN is set at build time (get the
 * token from the Cloudflare dashboard → Web Analytics → your site). If the site
 * is proxied through Cloudflare you can instead enable automatic injection from
 * the dashboard and skip the env var — the beacon still loads from
 * static.cloudflareinsights.com, which the CSP in public/_headers allows.
 */
const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

export function Analytics() {
  if (!token) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
