import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import * as cheerio from "cheerio";
import { fetchMailBody, extractFirstLink } from "../helpers.js";

export const register = (program: Command, client: Client) => {
  program
    .command("crawl-link")
    .description("Extract link from email then crawl its content, -n for numerical, -s for search keyword")
    .option("-n, --numerical <numerical>", "The position of the mail (1 is the newest)", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword to find the email")
    .action(async (options) => {
      const numerical: number = options.numerical;
      try {
        // Step 1: get email body
        const result = await fetchMailBody(client, numerical, options.search);
        if (!result) {
          console.log("Not a verified email address.");
          process.exit(0);
        }
        const { subject, body: htmlBody } = result;
        console.log(`Subject: ${subject}`);

        // Step 2: extract link from email body
        const link = extractFirstLink(htmlBody);
        if (!link) {
          console.log("No link found in this email.");
          process.exit(0);
        }
        console.log(`Link: ${link}`);

        // Step 3: crawl the URL
        console.log(`\nCrawling content...`);
        const res = await fetch(link, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; mail-auto-cli/1.0)" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const html = await res.text();

        // Step 4: parse HTML — targets Odoo Portal ticket structure
        const $page = cheerio.load(html);

        // Title: prefer #card_header to avoid grabbing the whole page heading
        const title = $page("#card_header h4, #card_header h5, main h4, main h5")
          .first().text().replace(/\s+/g, " ").trim()
          || $page("title").text().trim();

        // Stage badge
        const stage = $page("#card_header .badge, #card_header span")
          .last().text().replace(/\s+/g, " ").trim();

        // Use a Set to deduplicate — prevents repeated text from nested elements
        const seen = new Set<string>();
        const lines: string[] = [];

        // Priority selectors: target <p> elements directly, not wrapping divs
        for (const sel of ["#card_body p", ".o_thread_message_content p", ".o_thread_message_content pre"]) {
          $page(sel).each((_, el) => {
            const text = $page(el).text().replace(/\s+/g, " ").trim();
            if (text.length > 10 && !seen.has(text)) {
              seen.add(text);
              lines.push(text);
            }
          });
        }

        // Fallback: if no Odoo-specific selectors matched, grab all <p> in main
        if (lines.length === 0) {
          $page("main p").each((_, el) => {
            const text = $page(el).text().replace(/\s+/g, " ").trim();
            if (text.length > 20 && !seen.has(text)) {
              seen.add(text);
              lines.push(text);
            }
          });
        }

        console.log("\n" + "═".repeat(60));
        console.log(`TITLE : ${title}`);
        if (stage) console.log(`STAGE : ${stage}`);
        console.log("─".repeat(60));
        console.log(lines.join("\n\n") || "(No content found)");
        console.log("═".repeat(60));

      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
