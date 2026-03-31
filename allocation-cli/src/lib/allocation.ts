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
const GRAPHQL_ENDPOINT_V2 = "https://gate-way.mindx.edu.vn/crm-api/graphql";
const GRAPHQL_ENDPOINT_V1 = "https://crm.api2.mindx.edu.vn/graphql";

export type CrmVersion = "v1" | "v2";

// ── GraphQL ──────────────────────────────────────────────────────────────────

const GET_ORDER_BY_LEAD_V2 = `
  query Order_getByLeadId($leadId: String) {
    Order_getByLeadId(leadId: $leadId) {
      payments { id amount status }
      productItems { id calculation { priceAfterDiscount } }
      calculation { remaining }
    }
  }
`;

const GET_ORDER_BY_LEAD_V1 = `
  query OrderGet($leadId: String!) {
    Order_get(leadId: $leadId) {
      payments { id amount status }
      productItems { id calculation { priceAfterDiscount } }
      calculation { remaining }
    }
  }
`;
const UPDATE_PAYMENT_ALLOCATION_V2 = `
  mutation Order_updatePaymentAllocation($payload: UpdatePaymentAllocationPayload) {
    Order_updatePaymentAllocation(payload: $payload) { id }
  }
`;

const UPDATE_PAYMENT_ALLOCATION_V1 = `
  mutation UpdatePaymentAllocation($payload: UpdatePaymentAllocationPayload!) {
    UpdatePaymentAllocation(payload: $payload) { 
    id 
    leadId
    }
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

export function buildHeaders(crmToken: string, crmVersion: CrmVersion = "v2"): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${crmToken}`,
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (crmVersion === "v2") {
    headers.Referer = "https://crm-v2.mindx.edu.vn/";
  } else {
    headers.Referer = "https://crm.mindx.edu.vn/";
  }

  return headers;
}

// ── Core Logic ────────────────────────────────────────────────────────────────

export async function getOrder(leadId: string, crmToken: string, crmVersion: CrmVersion = "v2"): Promise<Order> {
  const operation_name = crmVersion === "v1" ? "OrderGet" : "Order_getByLeadId";
  const GET_ORDER_BY_LEAD_VERSION = crmVersion === "v1" ? GET_ORDER_BY_LEAD_V1 : GET_ORDER_BY_LEAD_V2;
  const GRAPH_ENDPOINT_VERSION = crmVersion === "v1" ? GRAPHQL_ENDPOINT_V1 : GRAPHQL_ENDPOINT_V2;

  const response = await axios.post(
    GRAPH_ENDPOINT_VERSION,
    { operationName: operation_name, query: GET_ORDER_BY_LEAD_VERSION, variables: { leadId } },
    { headers: buildHeaders(crmToken, crmVersion) }
  );

  if (response.data?.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(response.data.errors)}`);
  }

  const order = crmVersion === "v1"
    ? response.data?.data?.Order_get
    : response.data?.data?.Order_getByLeadId;

  if (!order) throw new Error(`Order not found for leadId: ${leadId}`);

  return {
    payments: order.payments || [],
    productItemIds: (order.productItems || []).map((p: { id: string }) => p.id),
    productItemPrices: (order.productItems || []).map((p: { calculation?: { priceAfterDiscount: number } }) => p.calculation?.priceAfterDiscount ?? 0),
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

    if (payment.status === "CANCELLED" || payment.status === "canceled") {
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

export function buildAllocationsToZero(
  productItemIds: string[]
): PaymentAllocation[] {
  return productItemIds.flatMap((id) => {
    const amount = 0;
    return [
      { productItemId: id, amount, purpose: "PRODUCT_ITEM_PRICE" },
      { productItemId: id, amount, purpose: "TRANSFER_FEE" },
    ];
  });
}

export async function resetPaymentAllocation(
  leadId: string,
  crmToken: string,
  order: Order,
  payment: Payment,
  onProgress?: (msg: string) => void,
  isDryRun: boolean = false,
  crmVersion: CrmVersion = "v2"
): Promise<void> {
  const paymentAllocationsForZero = buildAllocationsToZero(order.productItemIds);
  const payloadForZero = { leadId, paymentId: payment.id, paymentAllocations: paymentAllocationsForZero };

  onProgress?.(`[Reset] id=${payment.id} to zero (API: ${crmVersion})`);

  if (isDryRun) {
    onProgress?.(`  [DRY RUN] payloadForZero: ${JSON.stringify(payloadForZero, null, 2)}`);
    return;
  }

  if (crmVersion === "v1") {
    const requestForZero = await axios.post(
      GRAPHQL_ENDPOINT_V1,
      { operationName: "UpdatePaymentAllocation", query: UPDATE_PAYMENT_ALLOCATION_V1, variables: { payload: payloadForZero } },
      { headers: buildHeaders(crmToken, "v1") }
    );

    if (requestForZero.data?.errors) {
      throw new Error(`Reset error for payment ${payment.id}: ${JSON.stringify(requestForZero.data.errors)}`);
    }
  } else {
    const requestForZero = await axios.post(
      GRAPHQL_ENDPOINT_V2,
      { operationName: "Order_updatePaymentAllocation", query: UPDATE_PAYMENT_ALLOCATION_V2, variables: { payload: payloadForZero } },
      { headers: buildHeaders(crmToken, "v2") }
    );

    if (requestForZero.data?.errors) {
      throw new Error(`Reset error for payment ${payment.id}: ${JSON.stringify(requestForZero.data.errors)}`);
    }
  }
}

export async function updatePayment(
  leadId: string,
  crmToken: string,
  order: Order,
  payment: Payment,
  index: number,
  total: number,
  onProgress?: (msg: string) => void,
  isDryRun: boolean = false,
  crmVersion: CrmVersion = "v2"
): Promise<string> {
  const isLastPayment = index === total - 1;
  const paymentAllocations = buildAllocations(payment, order.productItemIds, order.productItemPrices, isLastPayment, order.remaining);

  const payload = { leadId, paymentId: payment.id, paymentAllocations };

  const statusLabel = payment.status === "CANCELLED" || payment.status === "canceled" ? ` [CANCELLED → amount=0]` : "";
  onProgress?.(`[Payment ${index + 1}/${total}] id=${payment.id}, amount=${payment.amount}, isLastPayment=${isLastPayment}${statusLabel} (API: ${crmVersion})`);

  if (isDryRun) {
    onProgress?.(`  [DRY RUN] payload: ${JSON.stringify(payload, null, 2)}`);
    return `DRY_RUN_${payment.id}`;
  }

  if (crmVersion === "v1") {
    const response = await axios.post(
      GRAPHQL_ENDPOINT_V1,
      { operationName: "UpdatePaymentAllocation", query: UPDATE_PAYMENT_ALLOCATION_V1, variables: { payload } },
      { headers: buildHeaders(crmToken, "v1") }
    );

    if (response.data?.errors) {
      throw new Error(`Update error for payment ${payment.id}: ${JSON.stringify(response.data.errors)}`);
    }

    const updatedId = response.data?.data?.UpdatePaymentAllocation?.id;
    onProgress?.(`updateAllocation success, OrderId: ${updatedId}`);
    return updatedId;
  } else {
    const response = await axios.post(
      GRAPHQL_ENDPOINT_V2,
      { operationName: "Order_updatePaymentAllocation", query: UPDATE_PAYMENT_ALLOCATION_V2, variables: { payload } },
      { headers: buildHeaders(crmToken, "v2") }
    );

    if (response.data?.errors) {
      throw new Error(`Update error for payment ${payment.id}: ${JSON.stringify(response.data.errors)}`);
    }

    const updatedId = response.data?.data?.Order_updatePaymentAllocation?.id;
    onProgress?.(`updateAllocation success, OrderId: ${updatedId}`);
    return updatedId;
  }
}
