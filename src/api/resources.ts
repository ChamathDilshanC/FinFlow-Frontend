import { apiJson, apiMutateJson } from "./http";

export type NotificationPreferences = {
  email_enabled: boolean;
  days_before_renewal: number;
  timezone: string;
};

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";
export type CategoryKind = "subscription" | "expense" | "both";
export type PaymentStatus = "paid" | "pending" | "failed" | "cancelled";
export type PaymentSource = "manual" | "import" | "system";

export function listSubscriptions(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/subscriptions?skip=0&limit=100", accessToken);
}

export function createSubscription(
  accessToken: string,
  body: {
    name: string;
    amount: number;
    currency?: string;
    billing_cycle: BillingCycle;
    category?: string | null;
    monthly_limit?: number | null;
    start_date: string;
    next_renewal_date?: string | null;
    is_active?: boolean;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>("/subscriptions", accessToken, "POST", body);
}

export function updateSubscription(
  accessToken: string,
  id: string,
  body: {
    name: string;
    amount: number;
    currency: string;
    billing_cycle: BillingCycle;
    category?: string | null;
    monthly_limit?: number | null;
    start_date: string;
    next_renewal_date?: string | null;
    is_active: boolean;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>(`/subscriptions/${encodeURIComponent(id)}`, accessToken, "PUT", body);
}

export function deleteSubscription(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(
    `/subscriptions/${encodeURIComponent(id)}`,
    accessToken,
    "DELETE",
  );
}

export function listCategories(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/categories?skip=0&limit=100", accessToken);
}

export function createCategory(
  accessToken: string,
  body: { name: string; icon?: string | null; color?: string | null; kind: CategoryKind },
) {
  return apiMutateJson<Record<string, unknown>>("/categories", accessToken, "POST", body);
}

export function updateCategory(
  accessToken: string,
  id: string,
  body: { name: string; icon?: string | null; color?: string | null; kind: CategoryKind },
) {
  return apiMutateJson<Record<string, unknown>>(`/categories/${encodeURIComponent(id)}`, accessToken, "PUT", body);
}

export function deleteCategory(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(`/categories/${encodeURIComponent(id)}`, accessToken, "DELETE");
}

export function listTransactions(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/transactions?skip=0&limit=100", accessToken);
}

export function createTransaction(
  accessToken: string,
  body: {
    category_id?: string | null;
    amount: number;
    currency?: string;
    occurred_at: string;
    merchant?: string | null;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>("/transactions", accessToken, "POST", body);
}

export function updateTransaction(
  accessToken: string,
  id: string,
  body: {
    category_id?: string | null;
    amount: number;
    currency: string;
    occurred_at: string;
    merchant?: string | null;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>(`/transactions/${encodeURIComponent(id)}`, accessToken, "PUT", body);
}

export function deleteTransaction(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(`/transactions/${encodeURIComponent(id)}`, accessToken, "DELETE");
}

export function listPayments(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/payments?skip=0&limit=100", accessToken);
}

export function createPayment(
  accessToken: string,
  body: {
    subscription_id?: string | null;
    amount: number;
    currency: string;
    paid_at: string;
    period_start?: string | null;
    period_end?: string | null;
    status?: PaymentStatus;
    source?: PaymentSource;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>("/payments", accessToken, "POST", body);
}

export function updatePayment(
  accessToken: string,
  id: string,
  body: {
    subscription_id?: string | null;
    amount: number;
    currency: string;
    paid_at: string;
    period_start?: string | null;
    period_end?: string | null;
    status: PaymentStatus;
    source: PaymentSource;
    notes?: string | null;
  },
) {
  return apiMutateJson<Record<string, unknown>>(`/payments/${encodeURIComponent(id)}`, accessToken, "PUT", body);
}

export function deletePayment(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(`/payments/${encodeURIComponent(id)}`, accessToken, "DELETE");
}

export function listBudgets(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/budgets?skip=0&limit=100", accessToken);
}

export function createBudget(
  accessToken: string,
  body: { category_id: string; budget_month: string; limit_amount: number; currency: string },
) {
  return apiMutateJson<Record<string, unknown>>("/budgets", accessToken, "POST", body);
}

export function updateBudget(
  accessToken: string,
  id: string,
  body: { category_id: string; budget_month: string; limit_amount: number; currency: string },
) {
  return apiMutateJson<Record<string, unknown>>(`/budgets/${encodeURIComponent(id)}`, accessToken, "PUT", body);
}

export function deleteBudget(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(`/budgets/${encodeURIComponent(id)}`, accessToken, "DELETE");
}

export function listExchangeRates(accessToken: string, fromDate: string, toDate: string, baseCurrency?: string) {
  const q = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    ...(baseCurrency ? { base_currency: baseCurrency } : {}),
  });
  return apiJson<Array<Record<string, unknown>>>(`/exchange-rates?${q.toString()}`, accessToken);
}

export function upsertExchangeRate(
  accessToken: string,
  body: { rate_date: string; base_currency: string; quote_currency: string; rate: number },
) {
  return apiMutateJson<Record<string, unknown>>("/exchange-rates", accessToken, "POST", body);
}

export function deleteExchangeRate(accessToken: string, id: string) {
  return apiMutateJson<{ detail: string; code: string }>(
    `/exchange-rates/${encodeURIComponent(id)}`,
    accessToken,
    "DELETE",
  );
}

export function getNotificationPreferences(accessToken: string) {
  return apiJson<NotificationPreferences>("/notifications/preferences", accessToken);
}

export function updateNotificationPreferences(accessToken: string, body: NotificationPreferences) {
  return apiMutateJson<NotificationPreferences>("/notifications/preferences", accessToken, "PUT", body);
}
