// Ticket type classifier.
// Reads the plain-text content of an Odoo ticket and returns the ticket category.

export type TicketType =
  | "not-enroll"
  | "drop-out"
  | "refund-reward-point"
  | "request-re-running"
  | "not-resale-upsale"
  | "tick-uncompleted"
  | "no-payment-date"
  | "make-order-failed"
  | "unknown";

// Valid types (excluding "unknown") — used by AI classifier for validation
export const VALID_TYPES: TicketType[] = [
  "not-enroll",
  "drop-out",
  "refund-reward-point",
  "request-re-running",
  "not-resale-upsale",
  "tick-uncompleted",
  "no-payment-date",
  "make-order-failed",
];

// Keyword rules — ordered by specificity (most specific first)
const RULES: { type: TicketType; keywords: string[] }[] = [
  {
    type: "refund-reward-point",
    keywords: ["hoàn điểm", "refund reward", "hoàn thưởng", "reward point", "hoàn điểm thưởng"],
  },
  {
    type: "not-resale-upsale",
    keywords: ["resale", "upsale", "re-sale", "up-sale", "không resale", "không upsale"],
  },
  {
    type: "tick-uncompleted",
    keywords: ["tick chưa hoàn thành", "tick uncompleted", "uncompleted", "chưa complete"],
  },
  {
    type: "request-re-running",
    keywords: ["chạy lại", "re-running", "request re-run", "yêu cầu chạy lại", "re-run"],
  },
  {
    type: "drop-out",
    keywords: ["nghỉ học", "drop out", "dropout", "học viên nghỉ", "xin nghỉ", "drop-out"],
  },
  {
    type: "no-payment-date",
    keywords: ["ngày chi trả", "Ngày chi trả phải sau ngày oder", "Ngày thanh toán"],
  },
  {
    type: "make-order-failed",
    keywords: [
      "lỗi tạo đơn",
      "make order failed",
      "không tạo được order",
      "không tạo order được",
      "Customer not found",
      "Không tìm thấy khách hàng"
    ]
  },
  {
    type: "not-enroll",
    keywords: [
      "không enroll",
      "chưa enroll",
      "lỗi enroll",
      "không kích hoạt",
      "cannot enroll",
      "enrollment failed",
      "not activated",
      "enroll thất bại",
    ],
  },
];

/**
 * Classify an Odoo ticket by its text content using keyword matching.
 * Returns the most specific matching type, or "unknown" if none matched.
 */
export function classify(content: string): TicketType {
  const lower = content.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.type;
    }
  }
  return "unknown";
}
