import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "daemon.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatLine(level: "INFO" | "WARN" | "ERROR", message: string): string {
  const now = new Date();
  const vnTime = now.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }); // sv-SE gives YYYY-MM-DD HH:mm:ss
  return `[${vnTime}] [${level}] ${message}`;
}

function write(level: "INFO" | "WARN" | "ERROR", message: string) {
  const line = formatLine(level, message);
  console.log(line);
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, line + "\n", "utf-8");
  } catch {
    // Don't crash daemon if logging fails
  }
}

export const logger = {
  info: (msg: string) => write("INFO", msg),
  warn: (msg: string) => write("WARN", msg),
  error: (msg: string) => write("ERROR", msg),
};
