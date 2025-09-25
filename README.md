## Sitemap Screenshot CLI

Visit every URL in a sitemap and save full-page screenshots using Playwright.

### Install

```bash
npm install
npm run build
```

Chromium for Playwright installs automatically.

### Usage

```bash
node dist/index.js <sitemapUrlOrPath> [options]
```

Options:

- **-o, --out <dir>**: Output directory (default: `screenshots`)
- **-c, --concurrency <n>**: Parallel browsers (default: `5`)
- **--timeout <ms>**: Navigation timeout (default: `30000`)
- **--retries <n>**: Retries per URL (default: `2`)
- **--wait <ms>**: Extra wait after load (default: `500`)
- **--user-agent <ua>**: Custom User-Agent
- **--viewport <WxH>**: Viewport size (default: `1366x3000`)
- **--skip-ssl-errors**: Ignore HTTPS errors
- **--delay <ms>**: Stagger task starts
- **--headless**: Run browser headless (default: true)

### Examples

```bash
node dist/index.js https://example.com/sitemap.xml -o shots --concurrency 8 --retries 3
```

```bash
node dist/index.js ./sitemap.xml --viewport 1440x4000 --skip-ssl-errors
```

### Notes

- Supports `sitemapindex` (multi-sitemap) and `urlset` files.
- Filenames are sanitized and saved as `.png`.
