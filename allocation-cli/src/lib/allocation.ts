// allocation-cli/src/lib/allocation.ts
// Pure business logic for CRM payment allocation.
// No CLI dependencies — safe to import from other packages.

import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const CRM_TOKEN = process.env.CRM_TOKEN || "";
const GRAPHQL_ENDPOINT = "https://gate-way.mindx.edu.vn/crm-api/graphql";

// ── GraphQL ──────────────────────────────────────────────────────────────────

const GET_ORDER_BY_LEAD_QUERY = `
  query Order_getByLeadId($leadId: String) {
    Order_getByLeadId(leadId: $leadId) {
      payments { id amount status }
      productItems { id calculation { priceAfterDiscount } }
      calculation { remaining }
    }
  }
`;

const UPDATE_PAYMENT_ALLOCATION_MUTATION = `
  mutation Order_updatePaymentAllocation($payload: UpdatePaymentAllocationPayload) {
    Order_updatePaymentAllocation(payload: $payload) { id }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type Payment = {
  id: string;
  amount: number;
  status: string;
};

export type Order = {
  payments: Payment[];
  productItemIds: string[];
  productItemPrices: number[];
  remaining: number;
};

export type PaymentAllocation = {
  productItemId: string;
  amount: number;
  purpose: "PRODUCT_ITEM_PRICE" | "TRANSFER_FEE";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function readCrmToken(): string {
  if (!CRM_TOKEN) {
    throw new Error("CRM_TOKEN is not defined in environment variables");
  }
  return CRM_TOKEN;
}

/** Like readCrmToken but returns null instead of throwing — safe for optional token callers. */
export function tryReadCrmToken(): string | null {
  try {
    return readCrmToken();
  } catch {
    return null;
  }
}

export function buildHeaders(crmToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${crmToken}`,
    Referer: "https://crm-v2.mindx.edu.vn/",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

// ── Core Logic ────────────────────────────────────────────────────────────────

export async function getOrder(leadId: string, crmToken: string): Promise<Order> {
  const response = await axios.post(
    GRAPHQL_ENDPOINT,
    { operationName: "Order_getByLeadId", query: GET_ORDER_BY_LEAD_QUERY, variables: { leadId } },
    { headers: buildHeaders(crmToken) }
  );
  if (response.data?.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(response.data.errors)}`);
  }
  const order = response.data?.data?.Order_getByLeadId;
  if (!order) throw new Error(`Order not found for leadId: ${leadId}`);
  return {
    payments: order.payments,
    productItemIds: order.productItems.map((p: { id: string }) => p.id),
    productItemPrices: order.productItems.map((p: { calculation: { priceAfterDiscount: number } }) => p.calculation.priceAfterDiscount),
    remaining: order.calculation?.remaining ?? 0,
  };
}

export function buildAllocations(
  payment: Payment,
  productItemIds: string[],
  productItemPrices: number[],
  isLastPayment: boolean,
  remaining: number
): PaymentAllocation[] {
  let totalProductItemPrice = 0;
  for (const productPrice of productItemPrices) {
    totalProductItemPrice += productPrice;
  }

  let allocatedAmountSoFar = 0;

  return productItemIds.flatMap((id, index) => {
    let amount: number;
    const isLastItem = index === productItemIds.length - 1;

    if (payment.status === "CANCELLED") {
      amount = 0;
    } else if (productItemIds.length === 1) {
      amount = payment.amount;
    } else if (isLastPayment) {
      /*
      For leads with multiple payments and multiple product items.
      We distribute evenly except the last one — for which we allocate maximum
      and let the system enforce the per-item cap automatically.
      */
      amount = remaining <= 0 ? payment.amount : 0;
    } else {
      if (isLastItem) {
        // Push all remaining amount to the last item
        amount = payment.amount - allocatedAmountSoFar;
      } else {
        const productPrice = productItemPrices[index] || 0;
        const exactNumerator = payment.amount * productPrice;
        const exactVal = totalProductItemPrice > 0 ? exactNumerator / totalProductItemPrice : payment.amount / productItemIds.length;

        amount = totalProductItemPrice > 0
          ? Math.round(exactVal)
          : Math.round(payment.amount / productItemIds.length);
      }
    }

    // Add allocated amount to track
    allocatedAmountSoFar += amount;

    return [
      { productItemId: id, amount, purpose: "PRODUCT_ITEM_PRICE" },
      { productItemId: id, amount: 0, purpose: "TRANSFER_FEE" },
    ];
  });
}

export async function updatePayment(
  leadId: string,
  crmToken: string,
  order: Order,
  payment: Payment,
  index: number,
  total: number,
  onProgress?: (msg: string) => void,
  isDryRun: boolean = false
): Promise<string> {
  const isLastPayment = index === total - 1;
  const paymentAllocations = buildAllocations(payment, order.productItemIds, order.productItemPrices, isLastPayment, order.remaining);
  const payload = { leadId, paymentId: payment.id, paymentAllocations };

  const statusLabel = payment.status === "CANCELLED" ? " [CANCELLED → amount=0]" : "";
  onProgress?.(`[Payment ${index + 1}/${total}] id=${payment.id}, amount=${payment.amount}, isLastPayment=${isLastPayment}${statusLabel}`);

  if (isDryRun) {
    onProgress?.(`  [DRY RUN] payload: ${JSON.stringify(payload, null, 2)}`);
    return `DRY_RUN_${payment.id}`;
  }

  const response = await axios.post(
    GRAPHQL_ENDPOINT,
    { operationName: "Order_updatePaymentAllocation", query: UPDATE_PAYMENT_ALLOCATION_MUTATION, variables: { payload } },
    { headers: buildHeaders(crmToken) }
  );

  if (response.data?.errors) {
    throw new Error(`Update error for payment ${payment.id}: ${JSON.stringify(response.data.errors)}`);
  }

  const updatedId = response.data?.data?.Order_updatePaymentAllocation?.id;
  onProgress?.(`updateAllocation success, OrderId: ${updatedId}`);
  return updatedId;
}
