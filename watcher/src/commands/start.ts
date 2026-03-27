import { Command } from "commander";
import { startDaemon } from "../daemon.js";

export function register(program: Command) {
  program
    .command("start", { isDefault: true })
    .description("Start the continuous background Watcher daemon process to poll the inbox")
    .option("--agent <name>", "Select which CLI agent to spawn for tasks", "agent")
    .action(async (options: { agent: string }) => {
      try {
        await startDaemon(options.agent);
      } catch (err) {
        console.error(`Fatal Daemon Error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    });
}
