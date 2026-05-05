import type { MenuKey } from "./types";

export const HOME_MENU_ITEMS: Array<{ key: MenuKey; title: string; subtitle: string }> = [
  { key: "overview", title: "Overview", subtitle: "Main KPIs and budget health" },
  { key: "subscriptions", title: "Subscriptions", subtitle: "Recurring services and cycles" },
  { key: "categories", title: "Categories", subtitle: "Expense groups and colors" },
  { key: "transactions", title: "Transactions", subtitle: "Recent spending records" },
  { key: "payments", title: "Payments", subtitle: "Paid subscription history" },
  { key: "budgets", title: "Budgets", subtitle: "Category allocation limits" },
  { key: "exchange", title: "Exchange rates", subtitle: "Currency conversion cache" },
  { key: "notifications", title: "Notifications", subtitle: "Renewal reminder settings" },
  { key: "profile", title: "Profile", subtitle: "Account email and defaults" },
  { key: "settings", title: "Settings", subtitle: "Date range and dashboard filters" },
];
