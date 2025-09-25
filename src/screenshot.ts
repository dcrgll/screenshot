import { chromium, Browser, BrowserContext, Page } from "playwright";
import pLimit from "p-limit";
import path from "node:path";
import fs from "node:fs/promises";

export type ScreenshotOptions = {
  outDir: string;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  extraWaitMs: number;
  userAgent?: string;
  viewport: { width: number; height: number };
  ignoreHTTPSErrors: boolean;
  startDelayMs: number;
  headless: boolean;
};

export async function screenshotUrls(
  urls: string[],
  options: ScreenshotOptions
): Promise<void> {
  const browser = await chromium.launch({ headless: options.headless });
  const limit = pLimit(Math.max(1, options.concurrency));

  try {
    await fs.mkdir(options.outDir, { recursive: true });

    const tasks = urls.map((url, index) =>
      limit(async () => {
        if (options.startDelayMs > 0) {
          await sleep(options.startDelayMs * index);
        }
        await captureWithRetries(browser, url, options);
      })
    );

    await Promise.all(tasks);
  } finally {
    await browser.close();
  }
}

async function captureWithRetries(
  browser: Browser,
  url: string,
  options: ScreenshotOptions
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      await captureOnce(browser, url, options);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await sleep(500 + 500 * attempt);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function captureOnce(
  browser: Browser,
  url: string,
  options: ScreenshotOptions
): Promise<void> {
  const context = await browser.newContext({
    userAgent: options.userAgent,
    viewport: options.viewport,
    ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(options.timeoutMs);
  page.setDefaultTimeout(options.timeoutMs);

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    if (options.extraWaitMs > 0) await sleep(options.extraWaitMs);

    // Full-page screenshot
    const filePath = path.join(options.outDir, toFilename(url) + ".png");
    await page.screenshot({ path: filePath, fullPage: true });
    // eslint-disable-next-line no-console
    console.log(`✔ Saved ${filePath}`);
  } finally {
    await page.close();
    await context.close();
  }
}

function toFilename(url: string): string {
  // Replace non-filename characters
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
