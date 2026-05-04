import { apiJson } from "./http";

export type NotificationPreferences = {
  email_enabled: boolean;
  days_before_renewal: number;
  timezone: string;
};

export function listSubscriptions(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/subscriptions?skip=0&limit=20", accessToken);
}

export function listCategories(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/categories?skip=0&limit=50", accessToken);
}

export function listTransactions(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/transactions?skip=0&limit=20", accessToken);
}

export function listPayments(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/payments?skip=0&limit=20", accessToken);
}

export function listBudgets(accessToken: string) {
  return apiJson<Array<Record<string, unknown>>>("/budgets?skip=0&limit=20", accessToken);
}

export function listExchangeRates(accessToken: string, fromDate: string, toDate: string, baseCurrency?: string) {
  const q = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    ...(baseCurrency ? { base_currency: baseCurrency } : {}),
  });
  return apiJson<Array<Record<string, unknown>>>(`/exchange-rates?${q.toString()}`, accessToken);
}

export function getNotificationPreferences(accessToken: string) {
  return apiJson<NotificationPreferences>("/notifications/preferences", accessToken);
}
