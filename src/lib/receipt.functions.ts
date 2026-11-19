import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { expenseCategories } from "./categories";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from "./receipt-rules";

const input = z.object({
  mediaType: z.enum(RECEIPT_TYPES),
  base64: z
    .string()
    .min(100)
    .max(Math.ceil((RECEIPT_MAX_BYTES * 4) / 3) + 16, "Image is larger than 5 MB")
    .regex(/^[A-Za-z0-9+/=]+$/, "Invalid image data"),
});

export type ReceiptResult = { merchant: string | null; total: number | null; date: string | null; category: string | null; readable: boolean };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "merchant", "total", "date", "category"],
  properties: {
    readable: { type: "boolean", description: "false if this is not a receipt or cannot be read" },
    merchant: { type: ["string", "null"] },
    total: { type: ["number", "null"], description: "Final total paid, as a number without currency symbols" },
    date: { type: ["string", "null"], description: "Transaction date as YYYY-MM-DD" },
    category: { type: ["string", "null"], enum: [...expenseCategories, null] },
  },
} as const;

export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; result: ReceiptResult } | { ok: false; message: string }> => {
    const { checkAiRateLimit } = await import("./ai-limits.server");
    const limited = await checkAiRateLimit(context.supabase, context.userId, "receipt");
    if (limited) return { ok: false, message: limited };
    try {
      const { generateObjectStreamed } = await import("./ai/gateway.server");
      const result = await generateObjectStreamed<ReceiptResult>(
        "You read shop receipts for an Indian expense tracker. Extract only what is clearly printed. Use null for anything unclear. Never guess a total. Pick the closest category from the allowed list.",
        [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the merchant name, final total (₹), date and a likely expense category from this receipt." },
              { type: "image", image: data.base64, mediaType: data.mediaType },
            ],
          },
        ],
        schema as never,
      );
      if (result.date && !/^\d{4}-\d{2}-\d{2}$/.test(result.date)) result.date = null;
      if (result.total !== null && !(result.total > 0)) result.total = null;
      return { ok: true, result };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Receipt reading is unavailable right now." };
    }
  });
