/**
 * Allowed image CDN domains for product images.
 * These must match the domains configured in next.config.js (remotePatterns).
 *
 * Security: URLs are validated server-side BEFORE saving to DB.
 * Client-side validation is UX-only — never trust the client.
 */
export const ALLOWED_IMAGE_DOMAINS = [
  // Tiendanube CDN
  'dcdn-us.mitiendanube.com',
  // CloudFront (Tiendanube assets)
  'd26lpennugtm8s.cloudfront.net',
  // Pexels (seed data)
  'images.pexels.com',
  // Picsum (seed data / placeholder)
  'picsum.photos',
  'fastly.picsum.photos',
] as const;

/**
 * Validate that a URL's hostname is in the allowed list.
 * Returns true if valid, false otherwise.
 */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Blocked URL patterns that should NEVER be accepted.
 * These cannot be overridden by ALLOWED_IMAGE_DOMAINS.
 */
const BLOCKED_URL_PATTERNS = [
  /^javascript:/i,
  /^data:(image\/(?!png|jpeg|jpg|gif|webp)|text\/html)/i,
  /^blob:/i,
  /^file:/i,
] as const;

/**
 * Returns true if the URL matches a blocked pattern.
 */
function isBlockedUrl(url: string): boolean {
  return BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Full validation: blocked patterns first, then domain allowlist.
 * Returns { valid: boolean; reason?: string }
 */
export function validateImageUrl(url: string): { valid: boolean; reason?: string } {
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, reason: 'La URL no puede estar vacía' };
  }

  if (isBlockedUrl(trimmed)) {
    return { valid: false, reason: 'Tipo de URL no permitida' };
  }

  if (!isAllowedImageUrl(trimmed)) {
    return {
      valid: false,
      reason: `Dominio no permitido. Usá una URL de: ${ALLOWED_IMAGE_DOMAINS.join(', ')}`,
    };
  }

  return { valid: true };
}
