import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { fetchMailBody, extractFirstLink } from "../helpers.js";
import { crawlOdooContent } from "../lib/odoo.js";

export const register = (program: Command, client: Client) => {
  program
    .command("crawl-odoo-content")
    .description("Extract Odoo link from email then crawl its content, -n for numerical, -s for search keyword")
    .option("-n, --numerical <numerical>", "The position of the mail (1 is the newest)", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword to find the email")
    .action(async (options) => {
      const numerical: number = options.numerical;
      try {
        const { subject, body: htmlBody } = await fetchMailBody(client, numerical, options.search);
        console.log(`Subject: ${subject}`);

        const link = extractFirstLink(htmlBody);
        if (!link) {
          console.log("No link found in this email.");
          process.exit(0);
        }
        console.log(`Link: ${link}`);

        console.log(`\nCrawling content...`);
        const content = await crawlOdooContent(link);
        console.log("\n" + "═".repeat(60));
        console.log(content ?? "(No content found)");
        console.log("═".repeat(60));

      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
