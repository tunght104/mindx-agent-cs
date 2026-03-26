# Workflow: Process Not Enroll

**Precondition:** email position/keyword is known, content has been crawled and confirmed as an enrollment failure.

## Step 1 — Get Lead ID

Run `pnpm mail crawl-id -n <position>` (or `--search <keyword>`).

- Extract lead ID from the line starting with "ID:".
- If no ID found → stop and report the error to user.

## Step 2 — Confirm allocation

**Ask user:** "I will update allocation for lead ID `<leadId>`. Confirm? [Y/n]"

- If user says no → stop.

## Step 3 — Run allocation

Run `pnpm allocation --lead-id <leadId>`.

- If output does NOT contain "updateAllocation success" → **stop immediately**. Do NOT send mail. Report the error.
- If successful → go to Step 4.

## Step 4 — Confirm and send reply mail

After successful allocation, read the `Remaining: <value>` line from the output.

- If `remaining > 0` → the student has not paid in full.
  - **Ask user:** "Remaining is `<remaining>`. Send pay-not-full reply? [Y/n]" or other mail
  - If confirmed → run `pnpm mail reply-id --id <messageId> --template pay-not-full.html`.

- If `remaining <= 0` → payment is complete.
  - **Ask user:** "Allocation complete. Send reply? [Y/n]" or other mail
  - If confirmed → run `pnpm mail reply-id --id <messageId> --template allocation.html`.

## Step 5 — Summary

Report: lead ID processed, remaining amount, allocation result, mail reply result.

---

### Available templates (`mail-auto-cli/template/`)
- `allocation.html` *(default)*
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
