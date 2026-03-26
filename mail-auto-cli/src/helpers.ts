import { Client } from "@microsoft/microsoft-graph-client";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PAGE_SIZE = 10;

// ── Shared Types ─────────────────────────────────────────────────────────────

export type MailAddress = {
  name: string;
  address: string;
};

export type MailMessage = {
  id: string;
  subject: string | null;
  isDraft: boolean;
  from: { emailAddress: MailAddress } | null;
  receivedDateTime: string;
};

export type MailBody = {
  subject: string;
  body: string;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a list of emails from inbox.
 * Supports pagination (page + pageSize) or keyword search.
 */
export const fetchMails = async (
  client: Client,
  options: { page: number; keyword?: string; select?: string; pageSize?: number }
): Promise<MailMessage[]> => {
  const { page, keyword, select = "id,subject,from,receivedDateTime,isDraft", pageSize = PAGE_SIZE } = options;
  if (!Number.isInteger(page) || page < 1) throw new Error("page must be a positive integer.");

  const skip = (page - 1) * pageSize;
  let request = client
    .api("/me/mailFolders/inbox/messages")
    .select(select);

  if (keyword) {
    request = request.search(`"${keyword}"`).top(pageSize);
  } else {
    request = request.orderby("receivedDateTime desc").top(pageSize).skip(skip);
  }

  const response = await request.get() as { value?: MailMessage[] };
  return Array.isArray(response?.value) ? response.value : [];
};

/**
 * Fetch a single email body by numerical position or keyword search.
 * Requires either `numerical` OR `keyword` to be provided.
 */
export const fetchMailBody = async (
  client: Client,
  numerical?: number,
  keyword?: string
): Promise<MailBody> => {
  let request = client
    .api("/me/mailFolders/inbox/messages")
    .select("id,subject,body");

  if (keyword) {
    // Search mode: find first matching email by keyword
    request = request.search(`"${keyword}"`).top(1);
  } else if (numerical && numerical >= 1) {
    // Numerical mode: fetch by inbox position
    request = request.orderby("receivedDateTime desc").skip(numerical - 1).top(1);
  } else {
    throw new Error("Must provide [numerical] or --search <keyword>.");
  }

  type MailBodyRaw = { subject: string | null; body: { content: string } | null };
  const response = await request.get() as { value?: MailBodyRaw[] };
  const mail = response?.value?.[0];
  if (!mail) throw new Error(
    keyword
      ? `No email found matching keyword: "${keyword}"`
      : `No email found at position ${numerical}.`
  );
  return { subject: mail.subject ?? "", body: mail.body?.content ?? "" };
};

/**
 * Extract the first non-mailto link from an HTML email body.
 */
export const extractFirstLink = (htmlBody: string): string => {
  const $ = cheerio.load(htmlBody);
  let odooLink = "";
  let fallbackLink = "";

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? "";
    if (!href || href.startsWith("mailto:")) return;

    // Prioritize Odoo ticket links
    if (!odooLink && href.includes("hrm.mindx.edu.vn")) {
      odooLink = href;
      return false; // break immediately
    }

    // Fallback: first non-Microsoft link
    if (!fallbackLink &&
      !href.includes("aka.ms") &&
      !href.includes("microsoft.com") &&
      !href.includes("microsoftonline.com")) {
      fallbackLink = href;
    }
  });

  return odooLink || fallbackLink;
};

/**
 * Load template file content from the template/ directory.
 */
export const loadTemplate = (filePath: string): string => {
  // Resolve relative to mail-auto-cli/template/, regardless of where the CLI is called from
  const base = path.resolve(__dirname, "../template");
  const candidates = [path.join(base, filePath), path.join(base, `${filePath}.html`)];
  const templateFilePath = candidates.find((p) => fs.existsSync(p));
  if (!templateFilePath) throw new Error(`File not found: ${filePath} or ${filePath}.html`);
  return fs.readFileSync(templateFilePath, "utf-8");
};

/**
 * Fetch the HTML body of a specific email by its Graph API message ID.
 */
export const fetchMailBodyById = async (client: Client, messageId: string): Promise<string> => {
  type BodyRaw = { body?: { content?: string } };
  const res = await client.api(`/me/messages/${messageId}`).select("body").get() as BodyRaw | null;
  return res?.body?.content ?? "";
};

