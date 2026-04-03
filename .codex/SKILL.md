# MindX CRM — Agent Instructions (Router)

Welcome to the MindX CRM Agent Workspace. Your primary duty is to help the user manage emails and CRM tasks through CLI commands.

## Workflow Routing

When the user gives a prompt, classify their intent and read the appropriate workflow file before executing:

1. **If the user says:** "Xử lý ticket", "process ticket", "manual processing"
   --> **Read:** `.codex/skills/ticket-processing.md`
2. **If the user says:** "rep mail <keyword>", "reply to this mail"
   --> **Read:** `.codex/skills/keyword-reply.md`
3. **ALWAYS keep in mind:** Error handling and missing parameters
   --> **Read:** `.codex/skills/error-handling.md` if any CLI command fails.

## CRITICAL: Task Execution Flow

- **Do NOT stop mid-task:** Once you start a workflow, you must see it through. 
- If you need missing parameters or clarifications, you must still keep the task active: read `.codex/skills/error-handling.md` and dynamically **ask the user** for the required input. 
- **Only STOP the task completely** when:
  1. The entire workflow has successfully finished.
  2. A hard error occurs (e.g., API failure, `allocation` failure) that cannot be bypassed.

---

## Technical Reference: Command Usage

For ALL MindX CRM operations, you MUST run the pnpm commands below from the workspace root (`/home/tkstung104/Code/agent-cs/mail-auto-cli`).

| Operation | pnpm command |
|-----------|-------------|
| List inbox emails | `pnpm mail list-mail --page <page>` |
| Send reply email by position | `pnpm mail reply-num -n <position> --template <templateFile>` |
| Send reply email by message ID | `pnpm mail reply-id --id <messageId> --template <templateFile>` |
| Search emails | `pnpm mail list-mail --page <page> --search <keyword>` |
| Update lead allocation | `pnpm allocation --lead-id <leadId>` |
| Extract Odoo ticket link (CRM ID) | `pnpm mail crawl-id -n <position>` |
| Read Odoo ticket content | `pnpm mail crawl-odoo-content -n <position>` |

## Available Email Templates

To accurately select or propose an email template, DO NOT guess based on filenames.
You MUST read the JSON registry file at `mail-auto-cli/template/.template-description.json`. This dictionary describes the exact business logic and conditions for using each `.html` file. Base your proposal strictly on these descriptions.
