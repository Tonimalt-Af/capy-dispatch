import { defineConfig } from '@playwright/test';
const exe = process.env.CHROME_PATH || (process.env.CI ? undefined : '/usr/bin/google-chrome');
export default defineConfig({
  testDir: 'e2e', timeout: 30_000, fullyParallel: true, reporter: 'list',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173/', launchOptions: exe ? { executablePath: exe } : {} },
  webServer: process.env.BASE_URL ? undefined : { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'mobile-landscape', use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    // Safari engine (iPhone): `npm run e2e:webkit` (needs `npx playwright install webkit`)
    ...(process.env.E2E_WEBKIT ? [{ name: 'webkit-landscape', use: { browserName: 'webkit' as const, launchOptions: {}, viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } }] : []),
  ],
});
