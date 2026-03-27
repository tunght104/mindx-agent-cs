import { Command } from "commander";
import { runApproveCli } from "../handle-manual-ticket.js";

export function register(program: Command) {
  program
    .command("manual-processing [messageIds...]")
    .alias("approve")
    .description("Review and approve pending tickets inside the classified/ directory")
    .option("-a, --all", "Skip the interactive prompt and immediately dispatch all tickets")
    .action(async (messageIds: string[], options: { all?: boolean }) => {
      const args: string[] = [];
      if (options.all) args.push("--all");
      args.push(...messageIds);
      await runApproveCli(args);
    });
}
