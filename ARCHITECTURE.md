# MindX CRM Automations Architecture

This document provides a high-level overview of the architectural design mapping the MindX CRM Automation monorepo workspace.

## System Overview
The repository contains a suite of targeted CLI tools designed to minimize manual processing constraints for Customer Success (CS) operations. It effectively bridges Microsoft Outlook communications (via Microsoft Graph API), Odoo (integrating internal mindx.edu.vn targets and mindxhrm.odoo.com domains), and the centralized MindX CRM.

The environment utilizes a modern `pnpm` workspace organizing independent Node.js packages:
1. **mail-auto-cli**: A command-line utility toolkit designed for manually invoking precise Outlook API procedures.
2. **allocation-cli**: A structured module acting as an isolated adapter interface translating variables towards the MindX CRM GraphQL infrastructure.
3. **watcher**: The core engine daemon that maintains perpetual polling states to extract data context from incoming emails and automatically route workflow templates seamlessly.

## Components & Data Flow Logic

### 1. Watcher Daemon State (`watcher/`)
**Purpose:** Serving as the definitive core processor routing automation pathways, iterating dynamically using Node's `setInterval`.

**Flow Operations:**
1. **Poll Check**: Queries the Outlook `/me/mailFolders/inbox/messages` endpoint every `POLL_INTERVAL_MS` retrieving raw context.
2. **Filter Auth**: Evaluates the `from.emailAddress` targets explicitly enforcing alignment against the isolated `.mail.config.json` (`ALLOWED_SENDERS`) arrays.
3. **Reference Crawling**: Programmatically extracts internal platform hyperlinks hidden within payload bodies targeting Odoo platforms. It forces headless background request operations isolating the targeted document strings from HTML.
4. **Classification Protocol**:
   - **Static Extraction**: Enforces precise regular expressions (`classifier.ts`) mapping immediate constraints against defined patterns (`not-enroll`, `tick-uncompleted`).
   - **AI Context Fallback Engine**: If manual expressions fail, it routes unmapped details via Node's `execFile` routing context strings towards isolated, system-native AI Agent CLI interfaces (i.e. `gemini`, `claude`, or specialized aliases mapped dynamically). Agent outputs map strict JSON variables utilizing the embedded Markdown ruleset prompt nested inside `runbook.md`.
5. **Dynamic Handlers Dispatching**:
   - **Auto-Tickets**: Instantly pipes validated metadata through robust internal function hooks routing context (`handlers/`). Operations directly push CRM changes locally executing GraphQL endpoints and sending notification protocols dynamically.
   - **Manual-Tickets**: Evaluates ticket variants targeting the array nested within `.watcher.config.json` under `MANUAL_TYPES`. Daemon hooks explicitly abort further complex manipulations, archiving formatted attributes straight to `classified/` storage arrays leaving constraints completely halted for offline validations.

### 2. Interactive CLI Pipeline (`watcher/`)
**Purpose:** Re-instates execution patterns for halted endpoints queued inside the filesystem. Built cohesively using the `commander` interface parsing syntax strings seamlessly.
When `pnpm watcher approve` invokes functionality reading the `classified/` directory logs.
- Standard operator sessions prompt dynamic console checklist components mapping selections natively without argument boundaries.
- Active AI Agent frameworks pipe commands avoiding complex TTY terminal interruptions seamlessly calling non-interactive overrides (`--all` or isolating `<messageId>`) to dispatch unresolved tickets silently.

### 3. Microsoft Graph Engine (`mail-auto-cli/`)
**Purpose:** A unified library interacting reliably against Microsoft Graph API endpoints decoupled entirely from business logic pipelines.
**Constraints & Design Points:**
- Authenticates securely natively tracking caching parameters nested safely inside `.mail-auto-cli-auth-record.json` using the local device login standard workflows.
- Contains an embedded template generation feature isolating `.html` text blocks routing formatted elements inside the independent `template/` path contexts enforcing static uniformity for client outreach notifications.

### 4. CRM Allocation Hook (`allocation-cli/`)
**Purpose:** Extremely streamlined infrastructure mapping logic specifically against internal GraphQL requests.

## Directory State Tracking Constraints
The master module natively respects and utilizes robust local filesystem architecture patterns simulating memory-less background queues effectively solving scaling constraints inherently natively without database environments:
- `pending/`: Tracks explicit Markdown audit trails detailing variables trapped currently facing active Agent CLI assessments.
- `classified/`: Tracks strictly JSON structures maintaining variables requiring manual evaluations halting script handlers natively.
- `completed/`: Archives verified tickets executing correctly completely sealing off future redundant API polling overlaps.
- `logs/`: Contains standard flat file tracking debugging states consistently auditing operations reliably natively.

## Security Paradigms & Local Secrets
- **Microsoft Environment Interfaces**: Safely constrained directly utilizing standard `.env` variables `AZURE_CLIENT_ID_GROUP` minimizing unauthorized access configurations natively.
- Configuration dependencies natively avoid hardcoded limits. Instead, arrays mapping `ALLOWED_SENDERS` and specific handler logic patterns inherently scale utilizing shared internal JSON dependencies directly enforcing scalable project modifications freely maintaining operational safety naturally isolated dynamically.
