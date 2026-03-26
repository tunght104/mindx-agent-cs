# Workflow: Process Drop Out

**Precondition:** email position/keyword is known, content has been crawled and confirmed as a drop-out request.

## Step 1 — Confirm and send mail

**Ask user:** "I will send a drop-out reply to this email. Confirm? [Y/n]"

- If user says no → stop.

## Step 2 — Send reply

Run `pnpm mail reply-id --id <messageId> --template drop-out.html`.

- If command fails → stop and report the error to user.

## Step 3 — Summary

Report: email replied successfully with `drop-out.html`.
