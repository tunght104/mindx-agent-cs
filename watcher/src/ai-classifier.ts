// AI fallback classifier using Agent CLI in headless mode.
// Called only when keyword-based classify() returns "unknown".
// Spawns `agent -p` with the ticket content piped via stdin.

import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { type TicketType, VALID_TYPES } from "./classifier.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNBOOK_PATH = path.resolve(__dirname, "../runbook.md");
const PENDING_DIR = path.resolve(__dirname, "../pending");
const CLASSIFIED_DIR = path.resolve(__dirname, "../classified");
const COMPLETED_DIR = path.resolve(__dirname, "../completed");

// Timeout for Agent CLI call (45 seconds — agent may take longer)
const AGENT_TIMEOUT_MS = 45_000;

// All types Agent is allowed to return (including unknown)
const ALL_TYPES = [...VALID_TYPES, "unknown"] as const;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Write ticket content to pending folder for audit trail.
 */
export function writePendingTicket(messageId: string, subject: string, odooContent: string): string {
  ensureDir(PENDING_DIR);
  // Sanitize messageId for filename (replace non-alphanumeric with _)
  const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60);
  const filePath = path.join(PENDING_DIR, `${safeId}.md`);
  const content = `# Pending Ticket\n\n**messageId:** ${messageId}\n**created:** ${new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })}\n\n---\n\n**Subject:**${subject}\n\n---\n\n${odooContent}`;
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

/**
 * Write a classified entry for a keyword-classified ticket (no pending file exists).
 */
export function writeClassifiedTicket(messageId: string, subject: string, type: string) {
  ensureDir(CLASSIFIED_DIR);
  const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60);
  const resultPath = path.join(CLASSIFIED_DIR, `${safeId}.json`);
  fs.writeFileSync(
    resultPath,
    JSON.stringify({ messageId, type, subject, source: "keyword", classifiedAt: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }) }, null, 2),
    "utf-8",
  );
}

/**
 * Write a completed entry after a handler successfully sent an email.
 */
export function writeCompletedTicket(messageId: string, subject: string, type: string, result: string) {
  ensureDir(COMPLETED_DIR);
  const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60);
  const filePath = path.join(COMPLETED_DIR, `${safeId}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify({ type, subject, result, completedAt: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }) }, null, 2),
    "utf-8",
  );
}

/**
 * Delete the classified entry after the handler successfully processed it.
 * Call this when a ticket transitions from "classified" to "completed".
 */
export function cleanupClassifiedTicket(messageId: string) {
  const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60);
  const classifiedPath = path.join(CLASSIFIED_DIR, `${safeId}.json`);
  try {
    if (fs.existsSync(classifiedPath)) fs.unlinkSync(classifiedPath);
  } catch { /* ignore — file may not exist if keyword-classified */ }
}

/**
 * Move a pending ticket to classified folder after successful AI classification.
 */
function moveToClassified(pendingPath: string, messageId: string, result: { type: string; reason?: string }) {
  ensureDir(CLASSIFIED_DIR);
  const basename = path.basename(pendingPath, ".md");
  const resultPath = path.join(CLASSIFIED_DIR, `${basename}.json`);
  fs.writeFileSync(resultPath, JSON.stringify({ messageId, ...result, source: "ai", classifiedAt: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }) }, null, 2), "utf-8");

  // Remove from pending
  try { fs.unlinkSync(pendingPath); } catch { /* ignore */ }
}

/**
 * Call Agent CLI in headless mode to classify ticket content.
 */
function callAgentHeadless(odooContent: string, agentCliName: string): Promise<string> {
  // Read runbook and embed directly — prevents Agent from using file-read tools
  let runbookContent = "";
  try {
    runbookContent = fs.readFileSync(RUNBOOK_PATH, "utf-8");
  } catch {
    runbookContent = "Classify the ticket into: not-enroll, drop-out, refund-reward-point, request-re-running, not-resale-upsale, tick-uncompleted, unknown";
  }

  const prompt = `${runbookContent}\n\n---\nClassify the following ticket content. Reply ONLY with a JSON object, no other text:\n\n${odooContent.slice(0, 4000)}`;

  return new Promise((resolve, reject) => {
    const child = execFile(agentCliName, ["-p", prompt], {
      timeout: AGENT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      cwd: path.resolve(__dirname, "../.."), // project root
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Agent CLI error: ${error.message}${stderr ? ` | stderr: ${stderr}` : ""}`));
        return;
      }
      resolve(stdout.trim());
    });

    // Also handle the case where agent is not installed
    child.on("error", (err) => {
      reject(new Error(`Failed to spawn agent: ${err.message}. Is Agent CLI installed?`));
    });
  });
}

/**
 * Parse Agent CLI output — extract JSON from response.
 * Agent may wrap the JSON in markdown code blocks.
 */
function parseAgentOutput(raw: string): { type?: string; reason?: string } | null {
  // Try to extract JSON from markdown code block
  const jsonBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find any JSON object in the output
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

/**
 * Classify ticket content using Agent CLI headless mode.
 * Writes to pending folder, calls Agent, parses result.
 * Returns the ticket type or "unknown" if classification fails.
 */
export async function classifyWithAI(messageId: string, subject: string, odooContent: string, agentCliName: string): Promise<TicketType> {
  // 1. Write to pending folder (audit trail)
  const pendingPath = writePendingTicket(messageId, subject, odooContent);
  logger.info(`  Written to pending: ${path.basename(pendingPath)}`);

  try {
    // 2. Call Agent CLI
    const raw = await callAgentHeadless(odooContent, agentCliName);
    logger.info(`  Agent raw response: ${raw.slice(0, 200)}`);

    // 3. Parse response
    const parsed = parseAgentOutput(raw);
    if (!parsed?.type) {
      logger.warn("  Agent returned unparseable response");
      return "unknown";
    }

    logger.info(`  Agent result: type=${parsed.type}, reason="${parsed.reason}"`);

    // 4. Validate type — allow "unknown" as a valid deliberate response
    if (!ALL_TYPES.includes(parsed.type as TicketType | "unknown")) {
      logger.warn(`  Agent returned unrecognized type: "${parsed.type}" — treating as unknown`);
      return "unknown";
    }

    if (parsed.type === "unknown") {
      logger.info(`  Agent deliberately returned unknown — keeping in pending for manual review`);
      return "unknown";
    }

    // 5. Move to classified (success)
    moveToClassified(pendingPath, messageId, { type: parsed.type, reason: parsed.reason });
    return parsed.type as TicketType;

  } catch (err) {
    logger.error(`  Agent classifier error: ${err instanceof Error ? err.message : err}`);
    // Keep in pending for manual review
    return "unknown";
  }
}
