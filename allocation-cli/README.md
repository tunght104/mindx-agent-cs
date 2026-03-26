# allocation-cli

CLI for updating payment allocations on MindX CRM-V2 via GraphQL. Fetches all payments for a lead and calls the update mutation for each one. Cancelled payments are automatically set to amount 0.

## Setup

```bash
pnpm install
```

## Usage

Run from this directory:

```bash
pnpm start [options]
```

Or from the workspace root:

```bash
pnpm allocate [options]
```

## Options

| Option | Required | Description |
|---|---|---|
| `--lead-id <leadId>` | Yes | CRM lead ID to process |
| `--dry-run` | No | Print payloads without calling the API |

## Example

```bash
pnpm allocate --lead-id "LEAD-ID"

# Preview without making changes
pnpm allocate --lead-id "LEAD-ID" --dry-run
```

## Scripts

| File | Description |
|---|---|
| `src/crm-v2-all-payment.ts` | Main entry — updates all payments for a lead (current version) |
| `src/crm-v2.ts` | Updates a single payment by index |
| `src/crm-v1.ts` | Legacy v1 CRM API version |
