// Handler for "drop-out" tickets.
// Simply sends the drop-out reply template — no allocation needed.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleDropOut(ctx: HandlerContext): Promise<string> {
  if (ctx.dryRun) {
    return `[DRY RUN] Would reply drop-out.html to messageId=${ctx.messageId}`;
  }
  await replyMail(ctx.mailClient, ctx.messageId, "drop-out.html");
  return `Replied drop-out.html to messageId=${ctx.messageId}`;
}
