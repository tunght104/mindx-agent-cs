// ── MindX Watcher Daemon ─────────────────────────────────────────────────────
// Continuously polls the Outlook inbox and auto-processes tickets.
//
// Environment variables (read from mail-auto-cli/.env):
//   AZURE_CLIENT_ID_GROUP   — required
//   AZURE_TENANT_ID_GROUP   — required
//   POLL_INTERVAL_MS        — optional, default 100_000 (100 s)
//   POLL_PAGE_SIZE          — optional, default 20 (emails per poll)
//   DRY_RUN                 — optional, set to "true" to skip API calls
//   CRM_TOKEN               — optional override for CRM token (default: read from file)

import { Client } from "@microsoft/microsoft-graph-client";
import { authProvider } from "../../mail-auto-cli/src/authentication.js"
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { logger } from "./logger.js";
import { stateManager } from "./state.js";
import { classify } from "./classifier.js";
import {
  fetchMails,
  fetchMailBodyById,
  extractOdooLink,
  crawlOdooContent,
  extractLeadId,
  ALLOWED_SENDERS,
} from "./mail-client.js";
import { classifyWithAI, writeClassifiedTicket, writeCompletedTicket, cleanupClassifiedTicket } from "./ai-classifier.js";
import { handleNotEnroll } from "./handlers/handle-not-enroll.js";
import { handleDropOut } from "./handlers/handle-drop-out.js";
import { handleRefundRewardPoint } from "./handlers/handle-refund-reward-point.js";
import { handleRequestReRunning } from "./handlers/handle-request-re-running.js";
import { handleNotResaleUpsale } from "./handlers/handle-not-resale-upsale.js";
import { handleTickUncompleted } from "./handlers/handle-tick-uncompleted.js";
import { handleNoPaymentDate } from "./handlers/handle-no-payment-date.js";
import { handleMakeOrderFailed } from "./handlers/handle-make-order-failed.js";
import { tryReadCrmToken } from "../../allocation-cli/src/lib/allocation.js";
import { runApproveCli } from "./cli/approve.js";

// ── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "100000", 10); // 100 s
const POLL_PAGE_SIZE = parseInt(process.env.POLL_PAGE_SIZE ?? "20", 10);
const DRY_RUN = process.env.DRY_RUN === "true";
const MANUAL_TYPES = [
  "no-payment-date"
];

const mailClient = Client.initWithMiddleware({ authProvider });

// ── CRM Token ────────────────────────────────────────────────────────────────
// Reads from CRM_TOKEN env var first, then delegates to allocation lib.

function readCrmToken(): string | null {
  if (process.env.CRM_TOKEN) return process.env.CRM_TOKEN;
  return tryReadCrmToken();
}

// ── Poll Cycle ────────────────────────────────────────────────────────────────

async function processEmail(messageId: string, subject: string): Promise<void> {
  logger.info(`Processing messageId=${messageId}`);

  // 1. Fetch email body by message ID
  const htmlBody = await fetchMailBodyById(mailClient, messageId);

  // 2. Extract Odoo link
  const odooLink = extractOdooLink(htmlBody);
  if (!odooLink) {
    logger.info(`  No Odoo link found — skipping messageId=${messageId}`);
    stateManager.markDone(messageId); // mark as done so we don't retry
    return;
  }

  // 3. Crawl Odoo content
  let odooContent: string | null;
  try {
    odooContent = await crawlOdooContent(odooLink);
  } catch (err) {
    logger.error(`  Odoo crawl failed for ${odooLink}: ${err instanceof Error ? err.message : err}`);
    return; // Don't mark done — retry next poll
  }

  if (!odooContent) {
    logger.info(`  No readable content at ${odooLink} — skipping`);
    stateManager.markDone(messageId);
    return;
  }

  // 4. Classify (keyword first, AI fallback if unknown)
  let ticketType = classify(odooContent);
  logger.info(`  Keyword classify: ${ticketType}`);

  if (ticketType === "unknown") {
    logger.info(`  Keyword match failed — calling AI fallback...`);
    ticketType = await classifyWithAI(messageId, subject, odooContent);
    logger.info(`  AI classify: ${ticketType}`);
  } else {
    // Keyword classification succeeded — record it
    writeClassifiedTicket(messageId, subject, ticketType);
  }

  if (ticketType === "unknown") {
    logger.warn(`  Both keyword and AI failed for messageId=${messageId}. Manual review needed.`);
    stateManager.markDone(messageId);
    return;
  }

  // 5. Extract leadId (needed for not-enroll)
  let leadId: string | null = null;
  try {
    leadId = await extractLeadId(odooLink);
    if (leadId) logger.info(`  Lead ID: ${leadId}`);
  } catch {
    // Non-fatal — handlers will handle null leadId gracefully
  }

  // 6. Check for Manual Tickets
  if (MANUAL_TYPES.includes(ticketType)) {
    logger.info(`  Ticket type ${ticketType} is configured as MANUAL. Saving to classified/ and awaiting approval.`);
    stateManager.markDone(messageId);
    return;
  }

  // 7. Process Auto Tickets: Build context and dispatch handler
  const ctx = {
    messageId,
    odooContent,
    leadId,
    mailClient,
    crmToken: readCrmToken(),
    dryRun: DRY_RUN,
  };

  let result: string;
  switch (ticketType) {
    case "not-enroll":
      result = await handleNotEnroll(ctx);
      break;
    case "drop-out":
      result = await handleDropOut(ctx);
      break;
    case "refund-reward-point":
      result = await handleRefundRewardPoint(ctx);
      break;
    case "request-re-running":
      result = await handleRequestReRunning(ctx);
      break;
    case "not-resale-upsale":
      result = await handleNotResaleUpsale(ctx);
      break;
    case "tick-uncompleted":
      result = await handleTickUncompleted(ctx);
      break;
    // case "no-payment-date":
    //   result = await handleNoPaymentDate(ctx);
    //   break;
    case "make-order-failed":
      result = await handleMakeOrderFailed(ctx);
      break;
    default:
      result = "unknown — skipped";
  }

  logger.info(`  Result: ${result}`);

  // Record completed tickets (those that are not skipped or errors)
  const isCompleted = !result.startsWith("SKIPPED") && !result.startsWith("unknown");
  if (isCompleted) {
    cleanupClassifiedTicket(messageId); // remove from classified — ticket is done
    writeCompletedTicket(messageId, subject, ticketType, result);
  }

  stateManager.markDone(messageId);
}

async function pollOnce(): Promise<void> {
  logger.info(`--- Poll cycle started (pageSize=${POLL_PAGE_SIZE}, dryRun=${DRY_RUN}) ---`);

  let emails: { id: string; subject: string | null; from?: any }[];
  try {
    emails = await fetchMails(mailClient, { page: 1, pageSize: POLL_PAGE_SIZE, select: "id,subject,receivedDateTime,from" });
  } catch (err) {
    logger.error(`Inbox fetch failed: ${err instanceof Error ? err.message : err}`);
    return;
  }

  const newEmails = emails.filter((m) => !stateManager.isDone(m.id));
  logger.info(`Fetched ${emails.length} emails, ${newEmails.length} new to process`);

  for (const email of newEmails) {
    try {
      logger.info(`Email: "${email.subject}" (${email.id})`);

      const senderName = email.from?.emailAddress?.name ?? "";
      const senderEmail = email.from?.emailAddress?.address ?? "";
      if (!ALLOWED_SENDERS.includes(senderName) && !ALLOWED_SENDERS.includes(senderEmail)) {
        logger.info(`  Skipping: Not a verified email address.`);
        stateManager.markDone(email.id);
        continue;
      }

      await processEmail(email.id, email.subject ?? "");
    } catch (err) {
      logger.error(`Unhandled error for message Subject=${email.subject}: ${err instanceof Error ? err.message : err}`);
      // Do NOT markDone — allow retry on next poll
    }
  }

  logger.info(`--- Poll cycle done ---`);
}

// ── Main Loop ─────────────────────────────────────────────────────────────────

async function main() {
  logger.info("=== MindX Watcher Daemon starting ===");
  logger.info(`Poll interval: ${POLL_INTERVAL_MS / 1000}s | Page size: ${POLL_PAGE_SIZE} | Dry-run: ${DRY_RUN}`);

  // Run immediately on startup, then on interval
  await pollOnce();

  setInterval(async () => {
    try {
      await pollOnce();
    } catch (err) {
      logger.error(`Unexpected error in poll loop: ${err instanceof Error ? err.message : err}`);
    }
  }, POLL_INTERVAL_MS);
}

const args = process.argv.slice(2);
if (args[0] === "approve") {
  const approveArgs = args.slice(1);
  runApproveCli(approveArgs).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    logger.error(`Fatal: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
