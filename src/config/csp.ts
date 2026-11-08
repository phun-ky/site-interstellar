/**
 * The site's Content Security Policy, delivered as a `<meta>` tag because
 * GitHub Pages cannot set response headers.
 *
 * Everything the site loads comes from its own origin, so every fetch
 * directive is `'self'` or nothing at all. A meta policy ignores
 * `frame-ancestors`, `report-uri` and `sandbox`, so they are left out; see
 * `SECURITY.md`.
 */
export const CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  'img-src': ["'self'"],
  'manifest-src': ["'self'"],
  // The background sound, fetched only once someone turns sound on
  'media-src': ["'self'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"]
};

/** The policy as the value of a `Content-Security-Policy` meta tag. */
export const CONTENT_SECURITY_POLICY = Object.entries(CSP_DIRECTIVES)
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ');

const CHARSET = /<meta charset="utf-8" \/>/i;

/**
 * Adds the policy to an HTML document, right after `<meta charset>` so it
 * applies before anything else in `<head>` loads.
 *
 * @param html - The HTML document.
 * @param policy - The policy to add.
 * @returns The document with the policy.
 * @throws When the document has no `<meta charset="utf-8" />`, or the
 *   policy has a character that would break out of the attribute.
 */
export const addContentSecurityPolicy = (
  html: string,
  policy: string = CONTENT_SECURITY_POLICY
): string => {
  if (/["<>&]/.test(policy)) {
    throw new Error(`The policy has a character not allowed here: ${policy}`);
  }

  if (!CHARSET.test(html)) {
    throw new Error('No <meta charset="utf-8" /> to place the policy after');
  }

  return html.replace(
    CHARSET,
    (charset) =>
      `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
  );
};
