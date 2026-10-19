import { defineConfig, devices } from "@playwright/test";

// A dedicated port, so the e2e server never collides with (or silently reuses) a dev
// server on vite's default 5173. Override with MOORHEN_E2E_PORT.
const e2ePort = Number(process.env.MOORHEN_E2E_PORT ?? 5199);

export default defineConfig({
    testDir: "./tests/e2e",
    snapshotPathTemplate: "{testDir}/snapshots/{testFileBaseName}-{arg}{ext}",
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: `http://127.0.0.1:${e2ePort}`,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 15_000,
        navigationTimeout: 60_000,
    },
    expect: {
        timeout: 20_000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
    ],
    webServer: {
        command: "npm run start:webcomponent:e2e",
        port: e2ePort,
        env: { MOORHEN_E2E_PORT: String(e2ePort) },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
    },
});
