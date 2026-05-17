// Resolves backend media paths (e.g. `/audio/<case>/<v>/es.mp3`) to an
// absolute URL. The API ships these site-relative because prod serves the SPA
// and `/audio/*` from one CloudFront distribution. In local dev the SPA is on
// `localhost:<port>` (no `/audio` route), so a site-relative `<audio>.src`
// 404s and silently fails — we re-anchor it to the CDN origin instead.
//
// CDN origin = `VITE_API_BASE_URL` with a trailing `/api` segment removed
// (same env read as `client.ts`). Empty env → return the path untouched
// (prod same-origin already resolves correctly).

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/$/,
  '',
);

/** Origin that serves `/audio/*` — the API base minus its `/api` suffix. */
const CDN_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

/**
 * Absolute URL for a backend media path. Pass-through for already-absolute
 * URLs (`http(s)://`, `s3://`) and when no CDN origin is configured.
 */
export function resolveMediaUrl(path: string): string {
  if (!path) return path;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path; // already absolute
  if (!CDN_ORIGIN) return path; // prod same-origin
  return `${CDN_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
