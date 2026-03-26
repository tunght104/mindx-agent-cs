// Handler for "not-resale-upsale" tickets.
// Simply sends the not-resale-upsale reply template.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleNotResaleUpsale(ctx: HandlerContext): Promise<string> {
  if (ctx.dryRun) {
    return `[DRY RUN] Would reply not-resale-upsale.html to messageId=${ctx.messageId}`;
  }
  await replyMail(ctx.mailClient, ctx.messageId, "not-resale-upsale.html");
  return `Replied not-resale-upsale.html to messageId=${ctx.messageId}`;
}
