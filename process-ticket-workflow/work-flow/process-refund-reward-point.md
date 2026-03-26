# Workflow: Process Refund Reward Point

**Precondition:** email position/keyword is known, content has been crawled and confirmed as a refund reward point request.

## Step 1 — Confirm and send mail

**Ask user:** "I will send a refund-reward-point reply to this email. Confirm? [Y/n]"

- If user says no → stop.

## Step 2 — Send reply

Run `pnpm mail reply-id --id <messageId> --template refund-reward-point.html`.

- If command fails → stop and report the error to user.

## Step 3 — Summary

Report: email replied successfully with `refund-reward-point.html`.
