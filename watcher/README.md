# MindX CRM Watcher Daemon

Watcher is a background daemon process that continuously polls the Outlook inbox to detect, classify, and automatically process incoming support emails (tickets).

## Directory Architecture

The lifecycle of a ticket moves through the following directories:
- `pending/`: Tickets temporarily stored for AI fallback classification (when keyword classification fails).
- `classified/`: Tickets that have been successfully assigned a `Type`.
  - **Auto Tickets** are processed immediately and do not stay in this folder.
  - **Manual Tickets** are safely kept here waiting for manual approval.
- `completed/`: Tickets that have been successfully processed and replied to.

## Configuration

Copy `.env.example` to `.env` (or reuse the shared `.env` from `mail-auto-cli`).

```env
AZURE_CLIENT_ID_GROUP=...
AZURE_TENANT_ID_GROUP=...
POLL_INTERVAL_MS=100000   # Polling interval in milliseconds (default: 100 seconds)
POLL_PAGE_SIZE=20         # Number of emails to process per batch
DRY_RUN=false             # Set to true to test logic without actually making Graph API calls
```

---

## Usage & Commands

Run these scripts from inside the `watcher/` directory:

### 1. Start the Polling Daemon
```bash
pnpm dev
# Or from the project root: pnpm watcher
```
The daemon will run continuously in the terminal. It automatically replies to Auto Tickets. For Manual Tickets (defined in the `MANUAL_TYPES` array inside `index.ts`), the daemon will stop the email sending process and safely store the ticket JSON file in the `classified/` directory.

### 2. Manual Ticket Approval (Approve CLI)
Use the `approve` command to review and dispatch emails that are waiting in the `classified/` directory.

**Method 1: Interactive Mode (For Human Operators)**
```bash
pnpm dev approve
# Or from the project root: pnpm watcher approve
```
The terminal will display an interactive checklist interface.
- Use the **Up/Down arrow keys** to navigate.
- Press **Space** to check the tickets you have already resolved manually on the MindX CRM.
- Press **Enter** to confirm. The tool will automatically load the templates and SEND the emails.

**Method 2: Batch Approve All (For Scripts / AI Agents)**
```bash
pnpm dev approve --all
```
This command fetches all pending tickets in the `classified/` directory and sends their emails immediately without any confirmation prompts. This is ideal when instructing an AI assistant to "approve all pending classified tickets".

**Method 3: Approve Specific Ticket (For Scripts / AI Agents)**
```bash
pnpm dev approve <messageId>
```
Targets a precise `messageId` and dispatches the email for that ticket alone, bypassing the UI. Ideal for an AI agent handling an individual ticket extraction workflow in the background.
