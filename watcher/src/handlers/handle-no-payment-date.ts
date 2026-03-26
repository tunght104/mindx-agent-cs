import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";


export async function handleNoPaymentDate(ctx: HandlerContext): Promise<string> {
    if (ctx.dryRun) {
        return `[DRY RUN] Would reply no-payment-date.html to messageId=${ctx.messageId}`;
    }
    await replyMail(ctx.mailClient, ctx.messageId, "no-payment-date.html");
    return `Replied no-payment-date.html to messageId=${ctx.messageId}`;
}
