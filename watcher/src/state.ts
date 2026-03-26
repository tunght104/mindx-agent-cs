import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, "../.processed-state.json");

// Max IDs to keep in memory/file to prevent unbounded growth
const MAX_IDS = 500;

interface State {
  processedIds: string[];
  lastChecked: string;
}

function loadFromDisk(): State {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as State;
    }
  } catch {
    // Corrupted state? Start fresh.
  }
  return { processedIds: [], lastChecked: new Date(0).toISOString() };
}

function saveToDisk(state: State) {
  // Trim to MAX_IDS (keep the most recent)
  if (state.processedIds.length > MAX_IDS) {
    state.processedIds = state.processedIds.slice(-MAX_IDS);
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: "utf-8", mode: 0o600 });
}

// ── In-memory cache ───────────────────────────────────────────────────────────
// Loaded once at startup. isDone() is a pure Set lookup (no disk I/O).
// markDone() updates the Set and flushes to disk once.

let _cache: State = loadFromDisk();
const _processedSet: Set<string> = new Set(_cache.processedIds);

export const stateManager = {
  isDone(messageId: string): boolean {
    return _processedSet.has(messageId);
  },

  markDone(messageId: string): void {
    if (!_processedSet.has(messageId)) {
      _processedSet.add(messageId);
      _cache.processedIds.push(messageId);
    }
    _cache.lastChecked = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    saveToDisk(_cache);
  },

  getLastChecked(): Date {
    return new Date(_cache.lastChecked);
  },
};
