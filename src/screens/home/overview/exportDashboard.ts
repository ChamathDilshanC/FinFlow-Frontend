import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { HomeDashboardState } from "../types";
import { formatMoney, parseAmount } from "../utils";
import { fmtShortDateTime, strField } from "../../../lib/recordFields";

type ExportFormat = "excel" | "pdf";

type ExportParams = {
  state: HomeDashboardState;
  currency: string | null;
  displayName: string;
  format: ExportFormat;
};

function escapeCsv(input: string): string {
  const value = input.replace(/"/g, '""');
  return /[",\n]/.test(value) ? `"${value}"` : value;
}

function buildCsv({ state, currency, displayName }: Omit<ExportParams, "format">): string {
  const now = new Date().toISOString();
  const rows: string[] = [];
  rows.push("FinFlow Dashboard Export");
  rows.push(`Generated At,${escapeCsv(now)}`);
  rows.push(`Account,${escapeCsv(displayName)}`);
  rows.push("");
  rows.push("Summary");
  rows.push("Metric,Value");
  rows.push(`Active subscriptions,${state.summary.active_subscription_count}`);
  rows.push(`Monthly equivalent total,${escapeCsv(state.summary.monthly_equivalent_total)}`);
  rows.push(`Expense total MTD,${escapeCsv(state.summary.expense_total_mtd)}`);
  rows.push(`Payment records total,${state.summary.payment_records_total}`);
  rows.push("");
  rows.push("Recent Subscriptions");
  rows.push("Name,Amount,Currency,Billing Cycle,Next Renewal,Status");
  for (const row of state.subscriptions.slice(0, 50)) {
    rows.push(
      [
        escapeCsv(strField(row.name) || "Subscription"),
        escapeCsv(strField(row.amount)),
        escapeCsv(strField(row.currency) || currency || "USD"),
        escapeCsv(strField(row.billing_cycle)),
        escapeCsv(strField(row.next_renewal_date)),
        escapeCsv(row.is_active === true ? "Active" : "Inactive"),
      ].join(","),
    );
  }
  rows.push("");
  rows.push("Recent Transactions");
  rows.push("Merchant,Amount,Currency,Occurred At");
  for (const row of state.transactions.slice(0, 100)) {
    rows.push(
      [
        escapeCsv(strField(row.merchant) || "Expense"),
        escapeCsv(strField(row.amount)),
        escapeCsv(strField(row.currency) || currency || "USD"),
        escapeCsv(strField(row.occurred_at)),
      ].join(","),
    );
  }
  return rows.join("\n");
}

function buildPdfHtml({ state, currency, displayName }: Omit<ExportParams, "format">): string {
  const money = (raw: unknown, fallback = "—"): string => {
    const parsed = parseAmount(strField(raw));
    return Number.isNaN(parsed) ? fallback : formatMoney(parsed, currency);
  };
  const subscriptions = state.subscriptions.slice(0, 8);
  const transactions = state.transactions
    .slice()
    .sort((a, b) => new Date(strField(b.occurred_at)).getTime() - new Date(strField(a.occurred_at)).getTime())
    .slice(0, 8);

  const subscriptionRows = subscriptions
    .map(
      (row) => `
        <tr>
          <td>${strField(row.name) || "Subscription"}</td>
          <td>${money(row.amount)}</td>
          <td>${strField(row.billing_cycle) || "—"}</td>
          <td>${strField(row.next_renewal_date) || "—"}</td>
        </tr>`,
    )
    .join("");

  const transactionRows = transactions
    .map(
      (row) => `
        <tr>
          <td>${strField(row.merchant) || "Expense"}</td>
          <td>${money(row.amount)}</td>
          <td>${fmtShortDateTime(row.occurred_at)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #0f172a; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      .meta { color: #475569; font-size: 12px; margin-bottom: 18px; }
      .cards { display: flex; gap: 10px; margin-bottom: 18px; }
      .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
      .label { color: #64748b; font-size: 11px; text-transform: uppercase; }
      .value { margin-top: 5px; font-weight: 700; font-size: 16px; }
      h2 { margin: 16px 0 8px; font-size: 15px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
      th { color: #334155; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>FinFlow Dashboard Report</h1>
    <div class="meta">Account: ${displayName} · Generated: ${new Date().toLocaleString()}</div>
    <div class="cards">
      <div class="card"><div class="label">Active subs</div><div class="value">${state.summary.active_subscription_count}</div></div>
      <div class="card"><div class="label">Monthly subs</div><div class="value">${money(state.summary.monthly_equivalent_total)}</div></div>
      <div class="card"><div class="label">Expense (MTD)</div><div class="value">${money(state.summary.expense_total_mtd)}</div></div>
    </div>
    <h2>Recent Subscriptions</h2>
    <table>
      <thead><tr><th>Name</th><th>Amount</th><th>Cycle</th><th>Next renewal</th></tr></thead>
      <tbody>${subscriptionRows || `<tr><td colspan="4">No subscriptions</td></tr>`}</tbody>
    </table>
    <h2>Recent Transactions</h2>
    <table>
      <thead><tr><th>Merchant</th><th>Amount</th><th>Occurred</th></tr></thead>
      <tbody>${transactionRows || `<tr><td colspan="3">No transactions</td></tr>`}</tbody>
    </table>
  </body>
</html>`;
}

export async function exportDashboardReport(params: ExportParams): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  if (params.format === "excel") {
    const csv = buildCsv(params);
    const fileUri = `${FileSystem.cacheDirectory}finflow-dashboard-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Export dashboard as Excel (CSV)",
      UTI: "public.comma-separated-values-text",
    });
    return;
  }

  const html = buildPdfHtml(params);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export dashboard as PDF",
    UTI: ".pdf",
  });
}
