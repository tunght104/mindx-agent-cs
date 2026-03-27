# MindX CRM Tools

A comprehensive `pnpm` monorepo workspace designed to automate routine CRM (Customer Relationship Management) and mailing operations for MindX Customer Success teams.

This workspace consists of a watcher daemon, specialized CLI developer toolkits, and AI-agent procedural workflows.

> **⚠️ CRITICAL:** Read `README.md` inside `mail-auto-cli` to set up the Azure ID required for sending emails. (Use the MindX email account).

---

## Workspace Architecture Overview

Refer to the complete [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into the system's inner workings and component data flows.

### Project Layout

```text
mindx-tools/
├── allocation-cli/          # Updates payment allocations on MindX CRM via GraphQL
├── mail-auto-cli/           # Microsoft Graph API utility toolkit & CLI
├── watcher/                 # Master daemon for polling Outlook & dispatching tickets
├── process-ticket-workflow/ # Markdown prompt workflows for AI-assisted ticket reviews
├── .mail.config.json        # Shared public configuration for trusted email senders
├── package.json             # Root workspace script shortcuts
└── pnpm-workspace.yaml      # Monorepo node setup
```

---

## Packages

### 1. `watcher`
Continuously monitors the Microsoft Outlook inbox to auto-process support tickets. It crawls linked Odoo pages, assigns strict ticket categories (using static arrays or an AI fallback engine), and automates email responses or queues them for manual review. Check `watcher/README.md` for full details.

### 2. `mail-auto-cli`
Provides automated Outlook mail capabilities using the Microsoft Graph API. It handles authentication (Device Code flow), fetches recent emails, and dispatches HTML template replies.

### 3. `allocation-cli`
Updates payment allocations on MindX CRM-V2 via GraphQL mutations. Fetches lead payments and automatically recalculates entries, effectively zeroing out canceled orders.

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 10

---

## Installation

Install all required monorepo dependencies from the workspace root:

```bash
pnpm install
```

Make sure to copy `.env.example` configurations to `.env` inside the root or the respective sub-package directories.

---

## Usage

### Executing from Root Scripts

The workspace provides handy aliases assigned to the root `package.json`:

```bash
# Start the continuous Mail Watcher polling daemon
pnpm watcher start

# Launch interactive manual ticket approval interface
pnpm watcher manual-processing

# Execute mail automation utility features
pnpm mail <command> [options]

# Trigger the CRM allocation mutation script
pnpm allocation [options]

# Test watcher functionality without modifying active state
DRY_RUN=true pnpm watcher start 
```

### Advanced Reference Examples

```bash
# Reply All to the 3rd most recent email in inbox using an HTML template
pnpm mail reply-num -n 3 -f allocation

# Crawl the Odoo ticket linked in the 2nd most recent email
pnpm mail crawl-odoo-content -n 2

# Update all payment allocations for a specific lead identifier (dry-run to preview payload)
pnpm allocation --lead-id <leadId> --dry-run
```

See the individual module documentation (`README.md` files) for further granular commands.
