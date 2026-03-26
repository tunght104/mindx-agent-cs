# Ticket Processing — Workflow Index

When asked to process a ticket ("xử lý ticket", "process ticket", etc.):

- Do NOT stop mid-task to ask clarifying questions. Execute immediately, if the user has not specified optional parameters, use mode "ask user" from aget. DO NOT STOP the task to ask clarifying questions

**If no email position or keyword given → ask:** "Which email? (position number or search keyword?)"

## Step 1 — Fetch email info

Run `pnpm mail list-mail -n <position>` (or `--search <keyword>`).
Save the `Id` value (messageId) from the row matching the target email.

## Step 2 — Crawl Odoo content

Run `pnpm mail crawl-odoo-content -n <position>` (or `--search <keyword>`).

- If output is "No link found in this email." → stop. Tell user this email has no Odoo link.
- Otherwise → read the content and go to Step 3.

## Step 3 — Analyze and route

Read the crawled content and determine the action:

| Content mentions | Workflow to follow |
|---|---|
| Enrollment failure ("không enroll", "chưa enroll", "lỗi enroll", "không kích hoạt", "cannot enroll", "enrollment failed", "not activated") | `work-flow/process-not-enroll.md` |
| Drop-out ("nghỉ học", "drop out", "dropout", "học viên nghỉ", "xin nghỉ") | `work-flow/process-drop-out.md` |
| Refund reward point ("hoàn điểm", "refund reward", "hoàn thưởng", "reward point") | `work-flow/process-refund-reward-point.md` |
| Request re-running ("chạy lại", "re-running", "request re-run", "yêu cầu chạy lại") | `work-flow/process-request-re-running.md` |
| Anything else unclear | Stop. Show content to user. Ask: "I cannot determine the action. What would you like to do?" |

Continue by reading and following the matched workflow file.

## REMEMBER: 
- If you classified the ticket as "anything else unclear", stop process ticket right now

