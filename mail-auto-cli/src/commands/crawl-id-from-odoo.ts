import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { fetchMailBody, extractFirstLink } from "../helpers.js";
import { extractLeadIdFromOdoo } from "../lib/odoo.js";

export const register = (program: Command, client: Client) => {
  program
    .command("crawl-id")
    .description("Extract Odoo ticket link from email, crawl it, then find the CRM record id inside, -n for numerical, -s for search keyword")
    .option("-n, --numerical <numerical>", "The position of the mail (1 is the newest)", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword to find the email")
    .action(async (options) => {
      const numerical = options.numerical;
      try {
        const { subject, body: htmlBody } = await fetchMailBody(client, numerical, options.search);
        console.log(`Subject: ${subject}`);

        const odooLink = extractFirstLink(htmlBody);
        if (!odooLink) {
          console.log("No link found in this email.");
          process.exit(0);
        }
        console.log(`Odoo link: ${odooLink}`);

        console.log(`\nFetching Odoo ticket...`);
        const crmId = await extractLeadIdFromOdoo(odooLink);

        if (!crmId) throw new Error("No CRM link with `id` parameter found in the Odoo ticket page.");

        console.log(`\nID: ${crmId}`);

      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
