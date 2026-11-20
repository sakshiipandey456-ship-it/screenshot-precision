import { z } from "zod";

const amount = z.coerce
  .number({ invalid_type_error: "Enter an amount" })
  .positive("Amount must be more than ₹0")
  .max(99_999_999, "That amount is too large")
  .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(2)), "Use at most 2 decimal places");
const isRealDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return dt.getFullYear() === y && dt.getMonth() === (m ?? 1) - 1 && dt.getDate() === d;
};
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").refine(isRealDate, "That isn't a valid date");
/** For things that have already happened (expenses, income, contributions). */
const pastOrToday = isoDate.refine((s) => s <= localToday(), "Date can't be in the future");

export const transactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  title: z.string().trim().min(1, "Give it a title").max(100, "Keep the title under 100 characters"),
  amount,
  category: z.string().min(1, "Choose a category"),
  txn_date: pastOrToday,
  payment_method: z.string().max(40).nullable(),
  description: z.string().trim().max(500, "Keep notes under 500 characters").nullable(),
});
export type TransactionForm = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({ category: z.string().nullable(), amount, month: z.string().regex(/^\d{4}-\d{2}-01$/) });
export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name your goal").max(80),
  target_amount: amount,
  saved_amount: z.coerce.number().min(0, "Can't be negative").max(99_999_999),
  target_date: isoDate.nullable(),
});
export const contributionSchema = z.object({ amount, contributed_on: pastOrToday, note: z.string().trim().max(200).nullable() });
export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Name it").max(80),
  amount,
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  next_payment_date: isoDate,
  category: z.string().min(1),
  is_active: z.boolean(),
});
export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  monthly_income: z.union([z.literal("").transform(() => null), z.coerce.number().min(0, "Can't be negative").max(99_999_999)]).nullable(),
  occupation: z.enum(["student", "working", "other"]).nullable(),
});

export type FieldKey =
  | "kind" | "title" | "amount" | "category" | "txn_date" | "payment_method" | "description"
  | "month" | "name" | "target_amount" | "saved_amount" | "target_date" | "contributed_on" | "note"
  | "frequency" | "next_payment_date" | "is_active" | "full_name" | "monthly_income" | "occupation";
export type FieldErrors = Partial<Record<FieldKey, string>>;

export function issuesToErrors(err: z.ZodError): FieldErrors {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out as FieldErrors;
}
