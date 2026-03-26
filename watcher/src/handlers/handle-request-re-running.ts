// Handler for "request-re-running" tickets.
// Simply sends the request-re-running reply template.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleRequestReRunning(ctx: HandlerContext): Promise<string> {
  if (ctx.dryRun) {
    return `[DRY RUN] Would reply request-re-running.html to messageId=${ctx.messageId}`;
  }
  await replyMail(ctx.mailClient, ctx.messageId, "request-re-running.html");
  return `Replied request-re-running.html to messageId=${ctx.messageId}`;
}
