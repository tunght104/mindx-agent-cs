// Handler for "tick-uncompleted" tickets.
// Simply sends the tick-uncompleted reply template.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleTickUncompleted(ctx: HandlerContext): Promise<string> {
  if (ctx.dryRun) {
    return `[DRY RUN] Would reply tick-uncompleted.html to messageId=${ctx.messageId}`;
  }
  await replyMail(ctx.mailClient, ctx.messageId, "tick-uncompleted.html");
  return `Replied tick-uncompleted.html to messageId=${ctx.messageId}`;
}
