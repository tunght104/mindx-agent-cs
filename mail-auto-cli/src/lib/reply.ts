// mail-auto-cli/src/lib/reply.ts
// Pure business logic for replying to Outlook emails.
// No CLI dependencies — safe to import from other packages.

import { Client } from "@microsoft/microsoft-graph-client";
import { loadTemplate } from "../helpers.js";

type MinimalMailMessage = {
  isDraft?: boolean;
  from?: { emailAddress?: { address?: string } };
};

/**
 * Reply-all to an email by its message ID using an HTML template file.
 * @param client - Microsoft Graph client
 * @param messageId - The Outlook message ID
 * @param templateFile - Filename inside mail-auto-cli/template/ (e.g. "allocation.html")
 */
export async function replyAllById(
  client: Client,
  messageId: string,
  templateFile: string
): Promise<void> {
  const content = loadTemplate(templateFile);

  const mail = await client
    .api(`/me/messages/${messageId}`)
    .select("id,subject,from,isDraft")
    .get() as MinimalMailMessage | null;

  if (!mail) throw new Error(`Mail not found: ${messageId}`);

  const hasFrom = Boolean(mail?.from?.emailAddress?.address?.trim());
  if (mail.isDraft || !hasFrom) {
    throw new Error(`Message ${messageId} is not replyable (draft or missing sender).`);
  }

  await client.api(`/me/messages/${messageId}/replyAll`).post({ comment: content });
}
