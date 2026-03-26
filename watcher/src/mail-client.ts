// watcher/src/mail-client.ts
// Thin re-export layer — no business logic lives here.
// All logic comes from mail-auto-cli/src/helpers.ts and mail-auto-cli/src/lib/.

export {
  fetchMails,
  fetchMailBodyById,
  extractFirstLink as extractOdooLink,
} from "../../mail-auto-cli/src/helpers.js";

export {
  crawlOdooContent,
  extractLeadIdFromOdoo as extractLeadId,
} from "../../mail-auto-cli/src/lib/odoo.js";

export { replyAllById as replyMail } from "../../mail-auto-cli/src/lib/reply.js";
