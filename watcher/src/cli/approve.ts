import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { Client } from "@microsoft/microsoft-graph-client";
import { authProvider } from "../../../mail-auto-cli/src/authentication.js";
import { replyMail } from "../mail-client.js";
import { writeCompletedTicket, cleanupClassifiedTicket } from "../ai-classifier.js";
import prompts from "prompts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLASSIFIED_DIR = path.resolve(__dirname, "../../classified");

export async function runApproveCli(args: string[]) {
  if (!fs.existsSync(CLASSIFIED_DIR)) {
    console.log("No classified directory found.");
    return;
  }

  const files = fs.readdirSync(CLASSIFIED_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No tickets waiting for approval in classified/.");
    return;
  }

  const tickets = files.map((file) => {
    const content = fs.readFileSync(path.join(CLASSIFIED_DIR, file), "utf-8");
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch { }

    // Fallback if messageId wasn't saved in the file (e.g. older files)
    const messageId = parsed.messageId || file.replace(".json", "");
    return {
      file,
      messageId,
      subject: parsed.subject || "No Subject",
      type: parsed.type || "unknown",
    };
  });

  let selectedMessageIds: string[] = [];

  if (args.includes("--all")) {
    selectedMessageIds = tickets.map((t) => t.messageId);
    console.log(`Approving ALL ${tickets.length} tickets via --all flag...`);
  } else if (args.length > 0) {
    // Treat any non `--` arguments as message IDs
    const ids = args.filter((a) => !a.startsWith("--"));
    selectedMessageIds = tickets.filter((t) => ids.includes(t.messageId)).map((t) => t.messageId);
    console.log(`Matched ${selectedMessageIds.length} tickets from provided IDs...`);
  } else {
    // Interactive mode
    if (!process.stdout.isTTY) {
      console.error("Error: Not running in an interactive terminal. Use --all or provide message IDs.");
      process.exit(1);
    }

    const { selected } = await prompts({
      type: "multiselect",
      name: "selected",
      message: "Chọn các ticket bạn ĐÃ XỬ LÝ xong trên CRM để gửi mail:",
      instructions: false,
      choices: tickets.map((t) => ({
        title: `[${t.type}] ${t.subject.slice(0, 60)}${t.subject.length > 60 ? "..." : ""}`,
        value: t.messageId,
      })),
    });

    if (!selected || selected.length === 0) {
      console.log("No tickets selected. Exiting.");
      return;
    }
    selectedMessageIds = selected;
  }

  if (selectedMessageIds.length === 0) {
    console.log("No tickets to process. Make sure the IDs provided exist in classified/.");
    return;
  }

  const mailClient = Client.initWithMiddleware({ authProvider });

  for (const messageId of selectedMessageIds) {
    const ticket = tickets.find((t) => t.messageId === messageId);
    if (!ticket) continue;

    console.log(`\nProcessing [${ticket.type}] ${ticket.subject}...`);
    try {
      if (ticket.type !== "unknown") {
        const templateName = `${ticket.type}.html`;
        await replyMail(mailClient, messageId, templateName);
        console.log(`Sent reply using ${templateName}`);

        writeCompletedTicket(messageId, ticket.subject, ticket.type, `Replied ${templateName} via approve CLI`);
        cleanupClassifiedTicket(ticket.file.replace(".json", "")); // cleanup uses safeId which usually matches the filename without .json
      } else {
        console.log(`Ticket is marked as 'unknown' type. Skipping email sending.`);
      }
    } catch (err) {
      console.error(`Failed to send for messageId=${messageId}:`, err);
    }
  }

  console.log("\nDone!");
}
