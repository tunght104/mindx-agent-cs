import { Client } from "@microsoft/microsoft-graph-client";

// Shared context passed to every ticket handler
export interface HandlerContext {
  messageId: string;
  odooContent: string;
  leadId: string | null;         // null if crawl-id step failed
  mailClient: Client;
  crmToken: string | null;       // null if token file is missing
  dryRun: boolean;
}

// Each handler returns a summary string for logging
export type Handler = (ctx: HandlerContext) => Promise<string>;
