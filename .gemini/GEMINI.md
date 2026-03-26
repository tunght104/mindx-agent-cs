# MindX CRM — Agent Instructions

## THE BEST CRITICAL: Processing tickets 

When asked to process a ticket ("xử lý ticket", "process ticket", etc.)

- When user says something like "process ticket for me" or When user asks to process a ticket (any phrasing), read **`process-ticket-workflow/index.md`** and follow the instructions there. Then analyze Continue by reading and following the matched workflow file.

- Do NOT stop mid-task to ask clarifying questions. Execute immediately, if the user has not specified optional parameters, use mode "ask user" from aget. DO NOT STOP the task to ask clarifying questions

## CRITICAL: Error handling — Report errors immediately, never auto-fix

- Do NOT stop mid-task to ask clarifying questions. Execute immediately, if the user has not specified optional parameters, use mode "ask user" from aget. DO NOT STOP the task to ask clarifying questions
- If a tool returns an error, **immediately report the error to the user**. Do NOT attempt workarounds.
- Do NOT make assumptions to bypass errors. Always ask user before retrying with different parameters.
- **When `pnpm allocation` is called as part of a multi-step flow** (e.g. allocation → send reply): if the output does NOT contain `updateAllocation success`, **STOP immediately**. Do NOT proceed to any next step. Report the failure to the user and wait for instructions.

## CRITICAL: Clarifying questions for optional parameters

- Do NOT stop mid-task to ask clarifying questions. Execute immediately, if the user has not specified optional parameters, use mode "ask user" from aget. DO NOT STOP the task to ask clarifying questions.

- Before running `pnpm mail list-mail`, if the user has NOT specified `--page` or `--search`, ask them first.
- Before running `pnpm allocation`, if the user has NOT specified `--lead-id` or `--dry-run`, ask them first.
- Before running `pnpm mail reply-num`, if the user has NOT specified `--template` or `-n` (mail position), ask them first.
- Before running `pnpm mail crawl-id`, if the user has NOT specified which email (by position or keyword), ask them first.
- Before starting the keyword-reply flow, if the user has NOT specified `templateFile`, ask them first.

## CRITICAL: Always use pnpm shell commands

For ALL MindX CRM operations, you MUST run the pnpm commands below from the workspace root (`/home/tkstung104/Code/mindx-tools`).

| Operation | pnpm command |
|-----------|-------------|
| List inbox emails | `pnpm mail list-mail --page <page>` |
| Send reply email by position | `pnpm mail reply-num -n <position> --template <templateFile>` |
| Send reply email by message ID | `pnpm mail reply-id --id <messageId> --template <templateFile>` |
| Search emails | `pnpm mail list-mail --page <page> --search <keyword>` |
| Update lead allocation | `pnpm allocation --lead-id <leadId>` |
| Extract Odoo ticket link (CRM ID) | `pnpm mail crawl-id -n <position>` |
| Read Odoo ticket content from email | `pnpm mail crawl-odoo-content -n <position>` |

### Command usage

- `pnpm mail list-mail` — args: `--page` (default 1), `--search` (optional keyword)
- `pnpm mail reply-num` — args: `--template` (e.g. `allocation.html`), `-n` (mail position, default 1)
- `pnpm mail reply-id` — args: `--id` (required, messageId from list-mail), `--template` (required)
- `pnpm allocation` — args: `--lead-id` (required), `--dry-run` (flag, default false). Token is read automatically from `allocation-cli/.crm-token-record.json`
- `pnpm mail crawl-id` — args: `-n` (default 1, email position), `--search` (optional keyword, overrides -n)
- `pnpm mail crawl-odoo-content` — args: `-n` (default 1, email position), `--search` (optional keyword, overrides -n)

### Multi-email Odoo analysis flow

When user says something like "read first 10 emails, analyze and process":

1. **Run `pnpm mail list-mail`** to get the list (note total count)
2. **Loop through each mail** (i = 1..N), for each:
   a. Run `pnpm mail crawl-odoo-content -n <i>`
   b. If output is `"No link found in this email."` → skip, move to next
   c. If Odoo content is returned → **analyze** the content
   d. **Propose a specific action** with reasoning (e.g. "This email requires allocation → I will run `pnpm allocation --lead-id xxx`. Do you agree?")
   e. **Wait for user approval** before executing
   f. If cannot determine action → report "Can't determine action" + paste the analyzed content
3. After loop: summarize results (how many processed, skipped, unresolvable)

> ⚠️ CRITICAL: Do NOT execute any action (reply, allocation, etc.) without explicit user approval for EACH email.

### Keyword-based reply flow

When user says something like "rep mail ", follow these steps **in order**:

1. **Run `pnpm mail list-mail --search <keyword>`** (or `--page <pageNumber>`) → returns a numbered list of emails with their `Id` values
2. **Show the list to user** and ask: "Which email you want to reply? (enter the number)"
3. **Wait for user's answer** (e.g. user says "1" or "2")
4. **Extract the `Id`** of the chosen email from the list
5. **Ask the user** which template to use (if not already specified)
6. **Run `pnpm mail reply-id --id <messageId> --template <templateFile>`**

> ⚠️ Do NOT skip step 2–3. You MUST show the list AND wait for user to confirm before replying.

### Available email templates (`mail-auto-cli/template/`)
- `allocation.html`
- `no-problem.html`
- `uncompleted.html`
- `initialization.html`
- `re-running.html`
- `drop-out.html`
- `no-active.html`
- `pay-not-full.html`
- `refund-reward-point.html`
- `request-re-running.html`
- `sync-v2-to-v1.html`
- `tick-uncompleted.html`

---


