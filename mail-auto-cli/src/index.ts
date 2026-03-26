import { Client } from "@microsoft/microsoft-graph-client";
import { Command } from "commander";

import { authProvider, AUTH_RECORD_FILE } from "./authentication.js";

import { register as registerRun } from "./commands/run.js";
import { register as registerReplyNum } from "./commands/reply-num.js";
import { register as registerReplyId } from "./commands/reply-id.js";
import { register as registerListMail } from "./commands/list-mail.js";
import { register as registerExtractLink } from "./commands/extract-link.js";
import { register as registerCrawlOdooContent } from "./commands/crawl-odoo-content.js";
import { register as registerCrawlIdFromOdoo } from "./commands/crawl-id-from-odoo.js";
import { register as registerLogout } from "./commands/logout.js";

const client = Client.initWithMiddleware({ authProvider });

// CLI setup

const program = new Command();

program
  .name("mail-cli")
  .description("CLI support Reply All mail Outlook (Delegated Mode)")
  .version("1.1.0");

// Register commands

registerRun(program, client);
registerReplyNum(program, client);
registerReplyId(program, client);
registerListMail(program, client);
registerExtractLink(program, client);
registerCrawlOdooContent(program, client);
registerCrawlIdFromOdoo(program, client);
registerLogout(program, AUTH_RECORD_FILE);

program.parse();
