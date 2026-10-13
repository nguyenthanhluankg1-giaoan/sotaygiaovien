/**
 * Helper to construct public share URLs.
 * If running in AI Studio developer sandbox (ais-dev-*),
 * switches to the public preview domain (ais-pre-*) so external recipients
 * can open the link directly without encountering 403 / auth errors.
 */
export function getPublicShareOrigin(): string {
  if (typeof window === 'undefined') return '';
  let origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export function buildPublicShareUrl(page: string, reportId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = getPublicShareOrigin();
  const pathname = window.location.pathname;
  return `${origin}${pathname}?page=${encodeURIComponent(page)}&reportId=${encodeURIComponent(reportId)}`;
}
