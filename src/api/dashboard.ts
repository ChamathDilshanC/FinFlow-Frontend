import { apiJson } from "./http";

export type CategorySpend = {
  category: string;
  monthly_equivalent_total: string;
};

export type DashboardSummary = {
  active_subscription_count: number;
  monthly_equivalent_total: string;
  monthly_budget: string | null;
  remaining_budget: string | null;
  over_budget: boolean;
  limit_warnings: string[];
  spend_by_category: CategorySpend[];
  expense_total_mtd: string;
  payment_records_total: number;
  default_currency: string | null;
};

export function getDashboardSummary(accessToken: string): Promise<DashboardSummary> {
  return apiJson<DashboardSummary>("/dashboard/summary", accessToken);
}
