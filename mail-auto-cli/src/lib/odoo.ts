// mail-auto-cli/src/lib/odoo.ts
// Pure business logic for crawling Odoo ticket pages.
// No CLI dependencies — safe to import from other packages.

import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (compatible; mail-auto-cli/1.0)";

/**
 * Crawl an Odoo ticket URL and return its readable text content.
 * Returns null if no content is found.
 */
export async function crawlOdooContent(odooUrl: string): Promise<string | null> {
  const res = await fetch(odooUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const sel of ["#card_body p", ".o_thread_message_content p", ".o_thread_message_content pre"]) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 10 && !seen.has(text)) { seen.add(text); lines.push(text); }
    });
  }

  // Fallback: if no Odoo-specific selectors matched, grab all <p> in main
  if (lines.length === 0) {
    $("main p").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 20 && !seen.has(text)) { seen.add(text); lines.push(text); }
    });
  }

  return lines.length > 0 ? lines.join("\n\n") : null;
}

/**
 * Crawl an Odoo ticket page and extract the CRM lead ID from URLs in its body text.
 * Returns null if not found.
 */
export async function extractLeadIdFromOdoo(odooUrl: string): Promise<string | null> {
  const res = await fetch(odooUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const allText = $("body").text();

  const urlRegex = /https?:\/\/\S+/g;
  for (const raw of (allText.match(urlRegex) ?? [])) {
    try {
      const cleaned = raw.replace(/[)\]>'".,:;]+$/, "");
      const u = new URL(cleaned);
      const rawId = u.searchParams.get("id");
      if (rawId) return rawId.replace(/"/g, "").trim();
    } catch { /* skip invalid URLs */ }
  }
  return null;
}
