import { Command } from "commander";
import {
  readCrmToken,
  getOrder,
  updatePayment,
  resetPaymentAllocation,
} from "./lib/allocation.js";

import type { CrmVersion } from "./lib/allocation.js";

type Args = {
  leadId: string;
  dryRun: boolean;
  crmToken: string;
  crmVersion: CrmVersion;
};

function parseArgs(): Args {
  const program = new Command();
  program
    .name("allocation")
    .version("1.0.0")
    .description("Update ALL payments allocation for a lead")
    .requiredOption("--lead-id <leadId>", "Lead ID to process")
    .option("--crm-token <crmToken>", "CRM token")
    .option("--crm-version <crmVersion>", "CRM version", "v2")
    .option("--dry-run", "Dry run — print payload without calling API", false);

  program.parse(process.argv);
  const { leadId, dryRun, crmToken, crmVersion } = program.opts();
  return { leadId, dryRun, crmToken, crmVersion };
}

// ── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const crmToken = args.crmToken || readCrmToken();
  const order = await getOrder(args.leadId, crmToken, args.crmVersion);
  const { payments } = order;

  console.log(`Lead: ${args.leadId}`);
  console.log(`Total payments: ${payments.length}`);

  if (payments.length === 0) {
    console.log("No payments found.");
    return;
  }

  console.log(`\n--- Phase 1: Reset all allocations to zero ---`);
  for (const [i, payment] of payments.entries()) {
    await resetPaymentAllocation(
      args.leadId,
      crmToken,
      order,
      payment,
      (msg) => console.log(msg),
      args.dryRun,
      args.crmVersion
    );
  }

  console.log(`\n--- Phase 2: Update allocations with amounts ---`);
  const results: string[] = [];
  for (const [i, payment] of payments.entries()) {
    const result = await updatePayment(
      args.leadId,
      crmToken,
      order,
      payment,
      i,
      payments.length,
      (msg) => console.log(msg),
      args.dryRun,
      args.crmVersion
    );
    results.push(result);
  }

  console.log(`\n✓ Done. Updated ${results.length} payment(s) for lead ${args.leadId}`);
  console.log(`Remaining: ${order.remaining}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
