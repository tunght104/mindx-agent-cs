import { Command } from "commander";

import { register as registerStart } from "./commands/start.js";
import { register as registerApprove } from "./commands/approve.js";

const program = new Command();

program
  .name("watcher")
  .description("MindX CRM Watcher & CLI toolkit")
  .version("1.0.0");

// Register commands
registerStart(program);
registerApprove(program);

program.parse();
