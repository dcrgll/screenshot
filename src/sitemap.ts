import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

export async function fetchSitemapUrls(
  sitemapLocation: string
): Promise<string[]> {
  const xml = await readXml(sitemapLocation);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  const data = parser.parse(xml);

  const results: string[] = [];

  // Handle sitemapindex
  if (data.sitemapindex && Array.isArray(data.sitemapindex.sitemap)) {
    const entries = data.sitemapindex.sitemap;
    for (const entry of entries) {
      const loc = entry.loc ?? entry["loc"];
      if (typeof loc === "string") {
        const childUrls = await fetchSitemapUrls(
          resolveIfRelative(sitemapLocation, loc)
        );
        results.push(...childUrls);
      }
    }
    return unique(results);
  }

  // Handle urlset
  if (data.urlset && Array.isArray(data.urlset.url)) {
    for (const entry of data.urlset.url) {
      const loc = entry.loc ?? entry["loc"];
      if (typeof loc === "string") {
        results.push(resolveIfRelative(sitemapLocation, loc));
      }
    }
    return unique(results);
  }

  // Fallbacks for single object structures
  if (data.urlset && data.urlset.url && typeof data.urlset.url === "object") {
    const loc = data.urlset.url.loc ?? data.urlset.url["loc"];
    if (typeof loc === "string")
      return [resolveIfRelative(sitemapLocation, loc)];
  }
  if (
    data.sitemapindex &&
    data.sitemapindex.sitemap &&
    typeof data.sitemapindex.sitemap === "object"
  ) {
    const loc =
      data.sitemapindex.sitemap.loc ?? data.sitemapindex.sitemap["loc"];
    if (typeof loc === "string")
      return await fetchSitemapUrls(resolveIfRelative(sitemapLocation, loc));
  }

  return [];
}

async function readXml(location: string): Promise<string> {
  // If it's a URL (http/https), fetch; else treat as file path
  if (/^https?:\/\//i.test(location)) {
    const res = await fetch(location);
    if (!res.ok)
      throw new Error(
        `Failed to fetch sitemap: ${res.status} ${res.statusText}`
      );
    return await res.text();
  }
  const filePath = path.resolve(location);
  return await fs.readFile(filePath, "utf8");
}

function resolveIfRelative(base: string, maybeRelative: string): string {
  try {
    // If maybeRelative is absolute URL already, this will succeed
    return new URL(maybeRelative).toString();
  } catch {
    // If base is a URL, resolve against it
    if (/^https?:\/\//i.test(base)) {
      return new URL(maybeRelative, base).toString();
    }
    // If base is a file path, resolve as file path
    return path.resolve(path.dirname(base), maybeRelative);
  }
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}
