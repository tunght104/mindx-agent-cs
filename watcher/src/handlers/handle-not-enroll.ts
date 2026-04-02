// Handler for "not-enroll" tickets.
// Flow: run allocation → pick template by remaining → reply mail.

import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";
import { logger } from "../logger.js";
import { getOrder, updatePayment, resetPayment } from "../../../allocation-cli/src/lib/allocation.js";

async function runAllocation(
  leadId: string,
  crmToken: string,
  dryRun: boolean
): Promise<number> {
  const order = await getOrder(leadId, crmToken, "v2");
  const { payments } = order;

  if (payments.length === 0) {
    logger.info(`  No payments found for leadId=${leadId}`);
    return order.remaining;
  }

  for (const [i, payment] of payments.entries()) {
    if (dryRun) {
      logger.info(`  [DRY RUN] Would reset payment ${payment.id}`);
      continue;
    }
    await resetPayment(leadId, crmToken, order, payment, "v2", (msg) =>
      logger.info(`  ${msg}`)
    );
  }

  for (const [i, payment] of payments.entries()) {
    if (dryRun) {
      logger.info(`  [DRY RUN] Would update payment ${payment.id}`);
      continue;
    }
    await updatePayment(leadId, crmToken, order, payment, i, payments.length, "v2", (msg) =>
      logger.info(`  ${msg}`)
    );
  }

  return order.remaining;
}

export async function handleNotEnroll(ctx: HandlerContext): Promise<string> {
  if (!ctx.leadId) {
    return `SKIPPED not-enroll — could not extract leadId, messageId=${ctx.messageId}`;
  }
  if (!ctx.crmToken) {
    return `SKIPPED not-enroll — CRM token not found, messageId=${ctx.messageId}`;
  }

  const remaining = await runAllocation(ctx.leadId, ctx.crmToken, ctx.dryRun);
  const template = remaining > 0 ? "pay-not-full.html" : "allocation.html";
  logger.info(`  Allocation done. remaining=${remaining} → template: ${template}`);

  if (!ctx.dryRun) {
    await replyMail(ctx.mailClient, ctx.messageId, template);
  }

  return ctx.dryRun
    ? `[DRY RUN] Would allocate + reply ${template}, leadId=${ctx.leadId}`
    : `Allocated leadId=${ctx.leadId}, remaining=${remaining}, replied ${template}`;
}
