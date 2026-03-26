import { Command } from "commander";
import * as fs from "fs";

export const register = (program: Command, authRecordFile: string) => {
  program
    .command("logout")
    .description("Logout from the CLI")
    .action(async () => {
      try {
        if (fs.existsSync(authRecordFile)) {
          fs.unlinkSync(authRecordFile);
          console.log("Successfully logged out!");
        } else {
          console.log("No cached auth record found");
        }
        console.log("Please run any command to log in again.");
      } catch (error: unknown) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
