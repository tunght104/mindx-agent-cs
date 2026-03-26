import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { fetchMailBody, extractFirstLink } from "../helpers.js";

export const register = (program: Command, client: Client) => {
  program
    .command("extract-link")
    .description("Extract the first link from an email body, -n for numerical, -s for search keyword")
    .option("-n, --numerical <numerical>", "The position of the mail (1 is the newest)", (value) => parseInt(value), 1)
    .option("-s, --search <keyword>", "Search keyword to find the email")
    .action(async (options) => {
      const numerical: number = options.numerical;
      try {
        const result = await fetchMailBody(client, numerical, options.search);
        if (!result) {
          console.log("Not a verified email address.");
          process.exit(0);
        }
        const { body } = result;
        const link = extractFirstLink(body);
        if (!link) {
          console.log("No link found in this email.");
          process.exit(0);
        }
        console.log(link);
      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
