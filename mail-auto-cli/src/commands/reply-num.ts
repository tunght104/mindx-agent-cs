import { Command } from "commander";
import { Client } from "@microsoft/microsoft-graph-client";
import { loadTemplate, type MailMessage } from "../helpers.js";

export const register = (program: Command, client: Client) => {
  program
    .command("reply-num")
    .description("Reply to a specific email by its position in the inbox, -n for numerical, -t for template")
    .requiredOption("-n, --numerical <numerical>", "The position of the mail (1 is the newest)", (value) => parseInt(value))
    .requiredOption("-t, --template <template>", "Path to content file in template/ directory")
    .action(async (options) => {
      const numerical = options.numerical;
      const filePath = options.template;
      try {
        if (!Number.isInteger(numerical) || numerical < 1) throw new Error("numerical must be a positive integer.");

        const content = loadTemplate(filePath);

        const response = await client
          .api("/me/mailFolders/inbox/messages")
          .orderby("receivedDateTime desc")
          .skip(numerical - 1)
          .top(1)
          .select("id,subject,from,isDraft")
          .get() as { value?: MailMessage[] };

        const targetMail = response.value?.[0];
        if (!targetMail) throw new Error("Mail not found at this position.");

        const hasFrom = Boolean(targetMail?.from?.emailAddress?.address?.trim());
        if (targetMail?.isDraft || !hasFrom) {
          throw new Error("Selected item is not replyable. Pick another numerical from list.");
        }

        console.log(`Replying to email: ${targetMail?.subject?.trim() || "(no subject)"}`);
        await client.api(`/me/messages/${targetMail.id}/replyAll`).post({ comment: content });
        console.log("Successfully Reply All!");
      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
