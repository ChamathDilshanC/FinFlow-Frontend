import type { DashboardSummary } from "../../api/dashboard";
import type { UserProfile } from "../../api/profile";
import type { NotificationPreferences } from "../../api/resources";

export type MenuKey =
  | "overview"
  | "subscriptions"
  | "categories"
  | "transactions"
  | "payments"
  | "budgets"
  | "exchange"
  | "notifications"
  | "profile"
  | "settings";

export type HomeDateRange = {
  fromDate: string;
  toDate: string;
};

export type HomeDashboardState = {
  profile: UserProfile;
  summary: DashboardSummary;
  subscriptions: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  budgets: Array<Record<string, unknown>>;
  exchangeRates: Array<Record<string, unknown>>;
  preferences: NotificationPreferences;
};
