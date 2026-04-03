# Workflow: Keyword-based Reply

**Trigger:** When user says something like "rep mail <keyword>".

## Flow Description

1. **Run `pnpm mail list-mail --search <keyword>`** (or `--page <pageNumber>`) → this returns a numbered list of emails with their `Id` values.
2. **Show the list to user** and ask: "Which email you want to reply? (enter the number)".
3. **Wait for user's answer** (e.g., user says "1" or "2").
4. **Extract the `Id`** of the chosen email from the list.
5. **Ask the user** which template to use (if not already specified in the initial prompt).
6. **Run `pnpm mail reply-id --id <messageId> --template <templateFile>`**.

> ⚠️ CRITICAL: Do NOT skip step 2–3. You MUST show the list AND wait for the user to confirm the exact email before replying.
