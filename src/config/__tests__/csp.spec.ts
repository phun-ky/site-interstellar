import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addContentSecurityPolicy,
  CONTENT_SECURITY_POLICY,
  CSP_DIRECTIVES
} from '../csp';

describe('CSP_DIRECTIVES', () => {
  test('blocks everything not listed', () => {
    assert.deepEqual(CSP_DIRECTIVES['default-src'], ["'none'"]);
  });

  test('loads only from the site itself', () => {
    for (const [directive, sources] of Object.entries(CSP_DIRECTIVES)) {
      for (const source of sources) {
        assert.ok(
          source === "'self'" || source === "'none'",
          `${directive} allows ${source}`
        );
      }
    }
  });

  test('allows what the built page loads', () => {
    for (const directive of [
      'script-src',
      'style-src',
      'font-src',
      'img-src',
      'manifest-src',
      'media-src'
    ]) {
      assert.deepEqual(CSP_DIRECTIVES[directive], ["'self'"], directive);
    }
  });

  test('locks down the base URL and form targets', () => {
    assert.deepEqual(CSP_DIRECTIVES['base-uri'], ["'none'"]);
    assert.deepEqual(CSP_DIRECTIVES['form-action'], ["'none'"]);
  });

  test('has no directive a meta policy ignores', () => {
    for (const directive of ['frame-ancestors', 'report-uri', 'sandbox']) {
      assert.equal(directive in CSP_DIRECTIVES, false, directive);
    }
  });
});

describe('CONTENT_SECURITY_POLICY', () => {
  test('joins every directive', () => {
    assert.equal(
      CONTENT_SECURITY_POLICY,
      "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; manifest-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'"
    );
  });
});

describe('addContentSecurityPolicy', () => {
  const page =
    '<html>\n  <head>\n    <meta charset="utf-8" />\n    <title>T</title>\n  </head>\n</html>';

  test('adds the policy right after the charset', () => {
    assert.equal(
      addContentSecurityPolicy(page, "default-src 'none'"),
      '<html>\n  <head>\n    <meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="default-src \'none\'" />\n    <title>T</title>\n  </head>\n</html>'
    );
  });

  test('uses the site policy by default', () => {
    assert.ok(
      addContentSecurityPolicy(page).includes(
        `content="${CONTENT_SECURITY_POLICY}"`
      )
    );
  });

  test('throws without a charset to place it after', () => {
    assert.throws(
      () => addContentSecurityPolicy('<html><head></head></html>'),
      /No <meta charset/
    );
  });

  test('throws on a policy that would break out of the attribute', () => {
    for (const policy of [
      'default-src "self"',
      "default-src 'none'><script>",
      'default-src &amp;'
    ]) {
      assert.throws(
        () => addContentSecurityPolicy(page, policy),
        /not allowed/,
        policy
      );
    }
  });
});
