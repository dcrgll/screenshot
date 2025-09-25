#!/usr/bin/env node

import { Command } from "commander";
import { fetchSitemapUrls } from "./sitemap.js";
import { screenshotUrls } from "./screenshot.js";
import path from "node:path";
import fs from "node:fs/promises";

const program = new Command();

program
  .name("sitemap-screenshot")
  .description("Visit each URL in a sitemap and take full-page screenshots")
  .argument("<sitemapUrl>", "URL or local path to sitemap.xml")
  .option("-o, --out <dir>", "Output directory for screenshots", "screenshots")
  .option(
    "-c, --concurrency <n>",
    "Max concurrent browsers",
    (v) => parseInt(v, 10),
    5
  )
  .option(
    "--timeout <ms>",
    "Navigation timeout in ms",
    (v) => parseInt(v, 10),
    30000
  )
  .option("--retries <n>", "Retries per URL", (v) => parseInt(v, 10), 2)
  .option(
    "--wait <ms>",
    "Extra wait after load in ms",
    (v) => parseInt(v, 10),
    500
  )
  .option("--user-agent <ua>", "Custom User-Agent string")
  .option("--viewport <WxH>", "Viewport, e.g. 1280x2000", "1366x3000")
  .option("--skip-ssl-errors", "Ignore HTTPS errors", false)
  .option(
    "--delay <ms>",
    "Delay between starting tasks (ms)",
    (v) => parseInt(v, 10),
    0
  )
  .option("--headless", "Run browser in headless mode", true)
  .action(async (sitemapUrl, options) => {
    const outDir = path.resolve(options.out);
    await fs.mkdir(outDir, { recursive: true });

    const urls = await fetchSitemapUrls(sitemapUrl);
    if (urls.length === 0) {
      console.error("No URLs found in sitemap.");
      process.exit(1);
    }

    const viewportMatch = String(options.viewport).match(/^(\d+)x(\d+)$/i);
    if (!viewportMatch) {
      console.error("Invalid --viewport. Use WxH, e.g. 1366x3000");
      process.exit(1);
    }
    const viewport = {
      width: parseInt(viewportMatch[1]!, 10),
      height: parseInt(viewportMatch[2]!, 10),
    };

    await screenshotUrls(urls, {
      outDir,
      concurrency: options.concurrency,
      timeoutMs: options.timeout,
      retries: options.retries,
      extraWaitMs: options.wait,
      userAgent: options.userAgent,
      viewport,
      ignoreHTTPSErrors: Boolean(options.skipSslErrors),
      startDelayMs: options.delay,
      headless: options.headless !== false,
    });
  });

program.parse();
