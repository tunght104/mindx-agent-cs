# MindX Watcher Daemon & CLI

The `watcher` is a background execution service (daemon) and a robust `commander`-based CLI toolkit that polls an Outlook inbox, categorizes arriving tickets, and automatically resolves CRM operations for Customer Success teams.

## State Management Architecture

The watcher relies heavily on the local file system for an effective audit trail and crash-resistant queue processing:
- `pending/`: Temporarily stores ticket text extracts when the system requires an AI Agent CLI fallback for semantic classification.
- `classified/`: Holds JSON database snapshots. **Manual Tickets** strictly drop into this directory, purposefully halting the automatic mailing script so a human can manually resolve application constraints first.
- `completed/`: Archives the ticket metadata successfully after the associated automated HTML email reply has been securely dispatched.

## Installation & Configuration

Ensure you replicate the `.env` settings located in the project's root or explicitly inside the `watcher/` directory:

```env
AZURE_CLIENT_ID_GROUP=...
AZURE_TENANT_ID_GROUP=...
POLL_INTERVAL_MS=100000   # Internal pause between mail checks (default: 100000ms)
POLL_PAGE_SIZE=20         # Threshold batch limit for emails processed
DRY_RUN=false             # Prevent actual API mutations if true
```

### Public Configurations

Vital application routing limits exist as publicly version-tracked JSON objects in the repository:

- `.watcher.config.json` (Inside watcher/): Maintains the active array of `MANUAL_TYPES`. Any ticket type assigned to this list immediately instructs the daemon to permanently shelf the incoming ticket in the `classified/` queue.

---

## Commands & Execution

The toolkit utilizes a structured `commander` interface. Access help context anytime by appending `--help` to the CLI calls. 

Run these commands straight from the workspace root:

### 1. Initiate Mail Polling (Daemon)

```bash
pnpm watcher start
```

Alternatively, you can boot the daemon passing specialized AI Agent CLI integrations:
```bash
pnpm watcher start --agent claude
# The default agent shell string evaluates to "agent"
```

The daemon runs continuously in your terminal instance. It executes complicated backend logic hooks for Auto Tickets immediately. For specified target limits like `no-payment-date`, the script holds raw extracts into `classified/` for explicit verification.

### 2. Manual Ticket Intercept & Approval

The `manual-processing` utility interacts with halted ticket files remaining in the queue.

**👉 Method 1: Interactive UI (For Human Operators)**
```bash
pnpm watcher manual-processing
```
This initializes a visual, interactive bash checklist prompt.
- **Scroll** utilizing Up/Down arrow keys.
- Toggle evaluated resolved ticket confirmations via mapping **Space**.
- Press **Enter** to formally batch-process target lists and dispatch the automated email instructions.

**👉 Method 2: Batch Execution Bypass (For Non-Interactive Operations/AI Scripts)**
```bash
pnpm watcher manual-processing --all
```
Instantly streams across every paused JSON ticket inside the `classified/` folder and fires their designated HTML mailing templates sequentially. The script entirely bypasses terminal visual outputs.

**👉 Method 3: Singular Specific ID Reference Constraints (For AI Scripts)**
```bash
pnpm watcher manual-processing <messageId> <messageId2>
```
Targets entirely unique `messageIds` allowing direct, headless script processing endpoints. Ideal inside broader operations architectures when an isolated AI agent isolates an identifier and successfully processes the constraint itself.
