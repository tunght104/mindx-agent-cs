# mail-auto-cli

CLI for interacting with Outlook via Microsoft Graph API. Uses device-code authentication with persistent token caching.

## Setup

```bash
pnpm install
```

Copy `.example.env` to `.env` and fill in the values:

```bash
cp .example.env .env
```

| Variable | Description |
|---|---|
| `AZURE_CLIENT_ID_GROUP` | Azure App Registration client ID |
| `AZURE_TENANT_ID_GROUP` | Azure tenant ID |

On first run you will be prompted to authenticate via browser. The session is cached and reused automatically.

## Instructions on how to get your Azure ID to use email.

1. Go to https://portal.azure.com/
2. Search App Registrations and tab **All applications**
3. Search MindX-Mail-Automator 
4. Copy **application ID** - it is the value of `AZURE_CLIENT_ID_GROUP`
5. Copy **directory (tenant) ID** - it is the value of `AZURE_TENANT_ID_GROUP`

## Commands

Run from this directory:

```bash
pnpm start <command> [options]
```

Or from the workspace root:

```bash
pnpm mail <command> [options]
```

| Command | Description |
|---|---|
| `list-mail` | List latest emails. Options: `--page <n>`, `--search <keyword>` |
| `reply-num <n> <template>` | Reply All to the Nth email using an HTML template |
| `reply-id <messageId> <template>` | Reply All to a specific email by message ID |
| `extract-link` | Extract the first URL from an email body. Option: `-n <n>` |
| `crawl-odoo-content` | Crawl the Odoo ticket linked in an email and print its content. Option: `-n <n>` |
| `crawl-id` | Extract the CRM record ID from a crawled Odoo ticket. Option: `-n <n>` |
| `logout` | Clear the saved authentication record |

## Mail Templates

HTML templates for replies are stored in `template/`:

- `allocation.html`
- `no-problem.html`
- `tick-uncompleted.html`
- `initialization.html`
- `request-re-running.html`
- `drop-out.html`
- `not-active.html`
- `pay-not-full.html`
- `refund-reward-point.html`
- `sync-v2-to-v1.html`

Pass the filename (without path) as the template argument.
