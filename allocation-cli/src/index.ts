import { Command } from "commander";
import {
  readCrmToken,
  getOrder,
  updatePayment,
} from "./lib/allocation.js";

type Args = {
  leadId: string;
  dryRun: boolean;
};

function parseArgs(): Args {
  const program = new Command();
  program
    .name("allocation")
    .version("1.0.0")
    .description("Update ALL payments allocation for a lead")
    .requiredOption("--lead-id <leadId>", "Lead ID to process")
    .option("--dry-run", "Dry run — print payload without calling API", false);

  program.parse(process.argv);
  const { leadId, dryRun } = program.opts();
  return { leadId, dryRun };
}

// ── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const crmToken = readCrmToken();
  const order = await getOrder(args.leadId, crmToken);
  const { payments } = order;

  console.log(`Lead: ${args.leadId}`);
  console.log(`Total payments: ${payments.length}`);

  if (payments.length === 0) {
    console.log("No payments found.");
    return;
  }

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
      args.dryRun
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
