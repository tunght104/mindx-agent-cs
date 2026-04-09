import axios from "axios";
import dotenv from "dotenv";
import type { CrmVersion } from "./allocation.js";

dotenv.config();

const GRAPHQL_ENDPOINT_V2 = "https://gate-way.mindx.edu.vn/crm-api/graphql";
const GRAPHQL_ENDPOINT_V1 = "https://crm.api2.mindx.edu.vn/graphql";

const ENDPOINT_SAVE_V1 = "https://crm.mindx.edu.vn/api/leads/{leadId}/order/productItems/{productItemId}/product/price";


// ── GraphQL ──────────────────────────────────────────────────────────────────

const GET_ORDER_BY_LEAD_V2 = `
  query Order_getByLeadId($leadId: String) {
    Order_getByLeadId(leadId: $leadId) {
      productItems { 
        id 
        calculation { 
          priceBeforeDiscount 
        } 
        promotion { 
          discountType 
          discountValue
        }
      }
    }
  }
`;

const GET_ORDER_BY_LEAD_V1 = `
  query OrderGet($leadId: String!) {
    Order_get(leadId: $leadId) {
      productItems { 
        id 
        calculation { 
          priceBeforeDiscount 
        }
        promotion { 
          discountType 
          discountValue
        } 
      }
    }
  }
`;

export type Order = {
  productItemIds: string[];
  productItemPrices: number[];
  productItemPromotions: number[];
};

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
    productItemIds: (order.productItems || []).map((p: { id: string }) => p.id),
    productItemPrices: (order.productItems || []).map((p: { calculation?: { priceBeforeDiscount: number } }) => p.calculation?.priceBeforeDiscount ?? 0),
    productItemPromotions: (order.productItems || []).map((p: { promotion?: { discountType: string; discountValue: number } }) => p.promotion ?? null),
  };
}

export async function savePrice(leadId: string, crmToken: string, crmVersion: CrmVersion = "v1") {
  const order = await getOrder(leadId, crmToken, crmVersion);
  const ENDPOINT_SAVE_V1 = "https://crm.mindx.edu.vn/api/leads/{leadId}/order/productItems/{productItemId}/product/price";

  for (let i = 0; i < order.productItemIds.length; i++) {
    const response = await axios.patch(
      ENDPOINT_SAVE_V1.replace("{leadId}", leadId).replace("{productItemId}", order.productItemIds[i] ?? ""),
      {
        "price": 36000000,
        "keepOldUpdatedPaymentSchedules": false
      },
      { headers: buildHeaders(crmToken, crmVersion) }
    );
    console.log(response.data);
  }
}
