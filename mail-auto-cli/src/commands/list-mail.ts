import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { fetchMails, type MailMessage } from "../helpers.js";

export const register = (program: Command, client: Client) => {
  program
    .command("list-mail")
    .description("List 10 latest emails, -p for page, -s for search keyword. Just use 1 of 2 options, dont use both.")
    .option("-p, --page <page>", "Page number", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword")
    .action(async (options) => {
      try {
        const messages = await fetchMails(client, { page: options.page, keyword: options.search });
        if (messages.length === 0) throw new Error("No emails found.");

        console.log(`\n--- RESULT (PAGE ${options.page}) ---`);
        console.table(messages.map((m: MailMessage, index: number) => ({
          No: index + 1,
          Subject: m?.subject?.trim() || "(no subject)",
          From: m?.from?.emailAddress?.address?.trim() || "(unknown sender)",
          Draft: Boolean(m?.isDraft),
          Id: m?.id,
        })));
      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};