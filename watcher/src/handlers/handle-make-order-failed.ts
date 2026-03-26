import { HandlerContext } from "./types.js";
import { replyMail } from "../mail-client.js";

export async function handleMakeOrderFailed(ctx: HandlerContext): Promise<string> {
    if (ctx.dryRun) {
        return `[DRY RUN] Would reply make-order-failed.html to messageId=${ctx.messageId}`;
    }
    await replyMail(ctx.mailClient, ctx.messageId, "make-order-failed.html");
    return `Replied make-order-failed.html to messageId=${ctx.messageId}`;
}
