// The browser tests (e2e/): the built site in a real browser, on a desktop
// and on a phone, and once more in WebKit, the engine of Safari.
import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4175);
// A sub-path, as a project site on GitHub Pages has: every page, file and
// picture address has to start with it. The trailing slash matters to the
// tests: page.goto("courses") stays inside it, page.goto("/courses") leaves.
const base = "/repka-light/";
const phone = { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true };
// A terminal inside a snap-packaged editor exports GIO_MODULE_DIR, and WebKit
// fails on every page with the modules it points to; WebKit runs without it.
const webkitEnv = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[0] !== "GIO_MODULE_DIR" && entry[1] !== undefined));

export default defineConfig({
  testDir: "./e2e",
  outputDir: ".e2e/results",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Nothing is retried: a test that passes only sometimes is a failure.
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: ".e2e/report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}${base}`,
    viewport: { width: 1280, height: 900 },
    locale: "ru-RU",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop" },
    // A test that needs a wide window is tagged @desktop and runs above only.
    { name: "phone", grepInvert: /@desktop/, use: phone },
    {
      name: "phone-webkit",
      grepInvert: /@desktop/,
      use: {
        ...phone,
        browserName: "webkit",
        // Exercise dialogs with reduced motion to keep animated targets stable in WebKit.
        reducedMotion: "reduce",
        launchOptions: { env: webkitEnv },
      },
    },
  ],
  webServer: {
    command: "node e2e/site.mjs",
    env: { PORT: String(port), BASE_PATH: base },
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
