# Workflow: Process Request Re-Running

**Precondition:** email position/keyword is known, content has been crawled and confirmed as a request re-running case.

## Step 1 — Confirm and send mail

**Ask user:** "I will send a request-re-running reply to this email. Confirm? [Y/n]"

- If user says no → stop.

## Step 2 — Send reply

Run `pnpm mail reply-id --id <messageId> --template request-re-running.html`.

- If command fails → stop and report the error to user.

## Step 3 — Summary

Report: email replied successfully with `request-re-running.html`.
