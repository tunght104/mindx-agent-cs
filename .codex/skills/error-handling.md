# Workflow: Global Error & Exception Handling

These rules apply to ALL actions and workflows.

## 1. System Errors
- If a tool or CLI command returns an error, **immediately report the error to the user**. 
- Do NOT attempt workarounds.
- Do NOT make assumptions to bypass errors. Always ask the user before retrying with different parameters.

## 2. Allocation Failures
- **When `pnpm allocation` is called as part of a multi-step flow** (e.g. allocation → send reply):
  - If the output does NOT contain `updateAllocation success`, **STOP immediately**.
  - Do NOT proceed to the next step (e.g., do not send the email).
  - Report the CRM failure to the user and wait for further instructions.

## 3. Missing Parameters
Before executing destructive or state-changing operations, ensure you have the required parameters from the user. If they are not specified, ask first:
- Before `pnpm mail list-mail`, ask for `--page` or `--search` if needed context is missing.
- Before `pnpm allocation`, ask for `--lead-id` or `--dry-run` if omitted.
- Before `pnpm mail reply-num`, ask for `--template` or `-n`.
- Before `pnpm mail crawl-id`, ask which email (position or keyword).
- Before starting a reply flow, ask for `templateFile`.

## 4. Unverified Sender Checkpoint
- If the output of an email check or crawl indicates **"Not a verified email address."**, this is NOT an error. It is a security checkpoint.
- **Action:** STOP processing this specific email immediately. Do not attempt to allocate or reply. Move on to the next email or report the skip to the user.
