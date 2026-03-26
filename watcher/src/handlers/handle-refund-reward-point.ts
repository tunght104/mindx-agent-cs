// Handler for "refund-reward-point" tickets.
// Simply sends the refund-reward-point reply template.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleRefundRewardPoint(ctx: HandlerContext): Promise<string> {
  if (ctx.dryRun) {
    return `[DRY RUN] Would reply refund-reward-point.html to messageId=${ctx.messageId}`;
  }
  await replyMail(ctx.mailClient, ctx.messageId, "refund-reward-point.html");
  return `Replied refund-reward-point.html to messageId=${ctx.messageId}`;
}
