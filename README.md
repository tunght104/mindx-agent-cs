# mindx-tools

A pnpm monorepo for automating routine CRM and mail operations at MindX. It consists of multiple CLI tools, a watcher daemon, and a collection of AI-agent workflow documents.

---

> ⚠️ CRITICAL: Read REAME.md in mail-auto-cli to get the Azure ID to use email (just use email MindX).

## Repository Structure

```
mindx-tools/
├── allocation-cli/          # Updates payment allocation on MindX CRM via GraphQL
├── mail-auto-cli/           # Interacts with Outlook via Microsoft Graph API
├── watcher/                 # Daemon for polling Outlook inbox and auto-processing tickets
├── process-ticket-workflow/ # Workflow documents for AI-assisted ticket processing
├── package.json             # Workspace root with shortcut scripts
└── pnpm-workspace.yaml
```

---

## Packages

### allocation-cli

Updates payment allocations for a lead on MindX CRM-V2. Fetches all payments associated with a lead via GraphQL, then calls the update mutation for each one. Cancelled payments are automatically set to amount 0.

The CRM bearer token is read from `.env` inside the package directory.

**Entry point:** `allocation-cli/src/index.ts`

---

### mail-auto-cli

Automates Outlook mail operations using Microsoft Graph API with device-code authentication (cached via `@azure/identity-cache-persistence`). Supports listing emails, replying with HTML templates, extracting links from email bodies, and crawling linked Odoo portal pages.

**Available commands:**

| Command | Description |
|---|---|
| `run` | Interactive flow for selecting and replying to an email (human use only) |
| `list-mail` | List latest emails from inbox |
| `reply-num` | Reply All to email at position N using an HTML template |
| `reply-id` | Reply All to a specific email by message ID |
| `extract-link` | Extract the first URL from an email body |
| `crawl-odoo-content` | Extract Odoo ticket link from email, crawl it, return title/stage/body |
| `crawl-link` | Extract any link from email, crawl it, return content |
| `crawl-id` | Extract CRM record ID from a crawled Odoo ticket |
| `logout` | Clear the saved authentication record |

**Entry point:** `mail-auto-cli/src/index.ts`

---

### watcher

Continuously polls the Outlook inbox and auto-processes incoming support tickets. It fetches emails via Microsoft Graph API, crawls linked Odoo content, classifies the ticket (using keyword matching or an AI fallback), and dispatches to specific handlers.

It handles the following ticket types:
- Enrollment Failure (`not-enroll`)
- Drop-out (`drop-out`)
- Reward Point Refund (`refund-reward-point`)
- Request Re-running (`request-re-running`)
- Resale/Upsale Issues (`not-resale-upsale`)
- Uncompleted Tick (`tick-uncompleted`)

**Entry point:** `watcher/src/index.ts`

---

### process-ticket-workflow

Markdown workflow documents used by AI agents to process support tickets. Not a runnable package.

| File | Description |
|---|---|
| `index.md` | Entry point — fetch email, crawl Odoo content, route to the right workflow |
| `work-flow/process-not-enroll.md` | Workflow for enrollment failure tickets |
| `work-flow/process-drop-out.md` | Workflow for drop-out tickets |
| `work-flow/process-refund-reward-point.md` | Workflow for reward point refund tickets |
| `work-flow/process-request-re-running.md` | Workflow for re-running request tickets |

---

## Prerequisites

- Node.js >= 18
- pnpm >= 10

---

## Installation

Install all dependencies from the workspace root:

```bash
pnpm install
```

---

## Usage

### Running from Root

Shortcut scripts are defined in the root `package.json`:

```bash
# mail-auto-cli
pnpm mail <command> [options]

# allocation-cli
pnpm allocation [options]

# watcher
pnpm watcher

# test watcher
DRY_RUN=true pnpm watcher 
```

**Examples:**

```bash
# List emails (page 1)
pnpm mail list-mail --page 1

# Reply All to the 3rd most recent email using a template
pnpm mail reply-num -n 3 -f allocation

# Crawl the Odoo ticket linked in the 2nd most recent email
pnpm mail crawl-odoo-content -n 2

# Extract CRM record ID from the most recent email
pnpm mail crawl-id -n 1

# Update all payment allocations for a lead
pnpm allocation --lead-id <leadId>

# Dry run (prints payload without calling the API)
pnpm allocation --lead-id <leadId> --dry-run
```

### Running from Subdirectory

```bash
cd mail-auto-cli && pnpm start <command> [options]
cd allocation-cli && pnpm start [options]
cd watcher && pnpm start
```

---

## Environment Variables

### mail-auto-cli & watcher (.env)

The `watcher` daemon shares the authentication record and `.env` file from the `mail-auto-cli` directory.

| Variable | Description |
|---|---|
| `AZURE_CLIENT_ID_GROUP` | Azure App Registration client ID (required) |
| `AZURE_TENANT_ID_GROUP` | Azure tenant ID (required) |
| `POLL_INTERVAL_MS` | Polling interval for `watcher` in milliseconds (default: 100000) |
| `POLL_PAGE_SIZE` | Processing batch size per poll for `watcher` (default: 20) |
| `DRY_RUN` | Set to `"true"` to skip actual API calls in `watcher` |
| `CRM_TOKEN` | Optional override for the local `.crm-token-record.json` |

Copy `.env.example` to `.env` inside `mail-auto-cli/` and fill in the values.

---

## Mail Templates

HTML reply templates are stored in `mail-auto-cli/template/`. Pass the filename (with or without `.html`) to any reply command:

| File | Description |
|---|---|
| `allocation.html` | Notification for allocation update |
| `no-problem.html` | Confirmation that issue is resolved |
| `tick-uncompleted.html` | Notification for uncompleted tick |
| `initialization.html` | Enrollment initialization notification |
| `request-re-running.html` | Re-running request confirmation |
| `drop-out.html` | Drop-out processing notification |
| `not-active.html` | Account not active notification |
| `pay-not-full.html` | Partial payment notification |
| `refund-reward-point.html` | Reward point refund notification |
| `sync-v2-to-v1.html` | CRM v2 to v1 sync notification |
