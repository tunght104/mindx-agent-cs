import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { replyAllById } from "../lib/reply.js";

export const register = (program: Command, client: Client) => {
  program
    .command("reply-id")
    .description("Reply to a specific email by its message ID, -i for id, -t for template")
    .requiredOption("-i, --id <id>", "The message ID of the email to reply to")
    .requiredOption("-t, --template <template>", "Path to content file in template/ directory")
    .action(async (options) => {
      const messageId = options.id;
      const filePath = options.template;
      try {
        await replyAllById(client, messageId, filePath);
        console.log("Successfully Reply All!");
      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
