/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
/** Content-Security-Policy (meta: GitHub Pages can't send headers). Build only: the dev server needs inline HMR scripts/websockets.
 * No inline script is allowed; 'unsafe-inline' styles are needed for style="" attributes set from templates (positions). */
export const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'", "media-src 'self'", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'"].join('; ');
const csp = (): Plugin => ({ name: 'csp-meta', apply: 'build', transformIndexHtml: (html) => html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="strict-origin-when-cross-origin">`) });
// base './' = relative URLs: works on GitHub Pages project sites (user.github.io/<repo>/) and any static host.
export default defineConfig({
  base: './',
  plugins: [csp()],
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
});
