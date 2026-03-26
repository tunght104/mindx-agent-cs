import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fetchMails, loadTemplate, type MailMessage } from "../helpers.js";

export const register = (program: Command, client: Client) => {
  program
    .command("run")
    .description("Interactive flow for HUMAN use only — requires manual keyboard input, NOT suitable for automation, -p for page, -s for search keyword")
    .argument("<file>", "Name of content file in template/ directory")
    .option("-p, --page <page>", "Page number", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword")
    .action(async (filePath, options) => {
      const rl = readline.createInterface({ input, output });
      try {
        const messages = await fetchMails(client, { page: options.page, keyword: options.search });
        if (messages.length === 0) {
          rl.close();
          throw new Error("No emails found.");
        }

        console.table(messages.map((m: MailMessage, index: number) => ({
          No: index + 1,
          Subject: m?.subject?.trim() || "(no subject)",
          From: m?.from?.emailAddress?.address?.trim() || "(unknown)",
          Draft: Boolean(m?.isDraft)
        })));

        const answer = await rl.question("\nEnter the number of the email you want to reply (or press Enter to exit): ");
        const numerical = parseInt(answer);

        if (!numerical || numerical < 1 || numerical > messages.length) {
          rl.close();
          throw new Error("Invalid number.");
        }

        const targetMail = messages[numerical - 1];
        if (!targetMail) throw new Error("Invalid number.");
        const content = loadTemplate(filePath);

        console.log(`\nSending reply to: ${targetMail.subject}...`);
        await client.api(`/me/messages/${targetMail.id}/replyAll`).post({ comment: content });
        console.log("Successfully sent reply!");

      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
      } finally {
        rl.close(); // Always close input interface to free up terminal
      }
    });
};
