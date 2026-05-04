import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { BLUE, PURPLE, ROSE } from "../homeTheme";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatInt, formatMoney, parseAmount } from "../utils";

export function HomeOverviewScreen() {
  const { state, setCrudOpen, displayName, currency } = useHomeData();
  const { summary } = state;

  const monthlyEq = parseAmount(summary.monthly_equivalent_total);
  const expenseMtd = parseAmount(summary.expense_total_mtd);
  const budget = summary.monthly_budget != null ? parseAmount(summary.monthly_budget) : NaN;
  const remaining = summary.remaining_budget != null ? parseAmount(summary.remaining_budget) : NaN;

  const categoryBars = useMemo(() => {
    const rows = summary.spend_by_category;
    const nums = rows.map((r) => parseAmount(r.monthly_equivalent_total)).filter((n) => !Number.isNaN(n) && n > 0);
    const max = nums.length ? Math.max(...nums) : 1;
    return rows.map((r) => {
      const v = parseAmount(r.monthly_equivalent_total);
      const w = Number.isNaN(v) || max <= 0 ? 0 : Math.min(100, (v / max) * 100);
      return { ...r, barWidth: w };
    });
  }, [summary.spend_by_category]);

  return (
    <>
      <Text style={styles.greeting}>Welcome back, {displayName} 👋</Text>
      <Text style={styles.subGreeting}>Your FinFlow snapshot — subscriptions, spend, and budget in one place.</Text>

      <View style={styles.rowActions}>
        <GlassPanel intensity={40} tint="light" borderRadius={14} style={{ flex: 1 }}>
          <Pressable style={styles.glassBtnFill} onPress={() => {}} accessibilityRole="button">
            <Text style={styles.outlineBtnText}>Export</Text>
          </Pressable>
        </GlassPanel>
        <GlassPanel
          intensity={55}
          tint="dark"
          borderRadius={14}
          style={{ flex: 1 }}
          tintMultiply="rgba(91,33,182,0.55)"
        >
          <Pressable
            style={styles.glassBtnFill}
            onPress={() => setCrudOpen({ resource: "subscription", mode: "create" })}
            accessibilityRole="button"
          >
            <Text style={styles.solidBtnText}>+ Add</Text>
          </Pressable>
        </GlassPanel>
      </View>

      <GlassPanel
        intensity={72}
        tint="dark"
        borderRadius={22}
        style={{ marginBottom: 16 }}
        contentStyle={styles.heroCardInner}
        tintMultiply="rgba(59,7,100,0.5)"
      >
        <Text style={styles.heroLabel}>Budget health</Text>
        <Text style={styles.heroScore}>
          {!Number.isNaN(monthlyEq) ? formatMoney(monthlyEq, currency) : "—"}{" "}
          <Text style={styles.heroScoreSub}>monthly subs (equiv.)</Text>
        </Text>
        <Text style={styles.heroDetail}>
          {summary.over_budget
            ? "You’re over your monthly budget cap — trim subscriptions or raise the cap in profile."
            : !Number.isNaN(remaining)
              ? `${formatMoney(remaining, currency)} headroom this month.`
              : "Set a monthly budget in your profile to track headroom."}
        </Text>
        {summary.limit_warnings.length > 0 ? (
          <View style={styles.warningList}>
            {summary.limit_warnings.slice(0, 3).map((w, i) => (
              <Text key={i} style={styles.warningItem}>
                • {w}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.heroDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </GlassPanel>

      <View style={styles.metricsRow}>
        <GlassPanel intensity={42} tint="light" borderRadius={18} style={{ flex: 1 }} contentStyle={styles.metricCardInner}>
          <Text style={styles.metricLabel}>Active subs</Text>
          <Text style={styles.metricValue}>{formatInt(summary.active_subscription_count)}</Text>
          <View style={styles.sparkBar}>
            <View style={[styles.sparkFill, { width: "72%", backgroundColor: BLUE }]} />
          </View>
        </GlassPanel>
        <GlassPanel intensity={42} tint="light" borderRadius={18} style={{ flex: 1 }} contentStyle={styles.metricCardInner}>
          <Text style={styles.metricLabel}>Expense (MTD)</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {!Number.isNaN(expenseMtd) ? formatMoney(expenseMtd, currency) : "—"}
          </Text>
          <View style={styles.sparkBar}>
            <View style={[styles.sparkFill, { width: "55%", backgroundColor: ROSE }]} />
          </View>
        </GlassPanel>
      </View>

      <View style={styles.metricsRow}>
        <GlassPanel intensity={42} tint="light" borderRadius={18} style={{ flex: 1 }} contentStyle={styles.metricCardInner}>
          <Text style={styles.metricLabel}>Payments logged</Text>
          <Text style={styles.metricValue}>{formatInt(summary.payment_records_total)}</Text>
          <View style={styles.sparkBar}>
            <View style={[styles.sparkFill, { width: "40%", backgroundColor: PURPLE }]} />
          </View>
        </GlassPanel>
        <GlassPanel intensity={42} tint="light" borderRadius={18} style={{ flex: 1 }} contentStyle={styles.metricCardInner}>
          <Text style={styles.metricLabel}>Monthly budget</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {!Number.isNaN(budget) ? formatMoney(budget, currency) : "—"}
          </Text>
          <View style={styles.sparkBar}>
            <View
              style={[
                styles.sparkFill,
                { width: `${Math.min(100, summary.over_budget ? 100 : 65)}%`, backgroundColor: "#0ea5e9" },
              ]}
            />
          </View>
        </GlassPanel>
      </View>

      <Text style={styles.sectionTitle}>Spend by category</Text>
      <Text style={styles.sectionSub}>Subscription monthly-equivalent split</Text>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        {categoryBars.length === 0 ? (
          <Text style={styles.emptyText}>No active subscriptions yet.</Text>
        ) : (
          categoryBars.map((row) => (
            <View key={row.category} style={styles.catRow}>
              <View style={styles.catLabelRow}>
                <Text style={styles.catName}>{row.category}</Text>
                <Text style={styles.catAmt}>
                  {!Number.isNaN(parseAmount(row.monthly_equivalent_total))
                    ? formatMoney(parseAmount(row.monthly_equivalent_total), currency)
                    : row.monthly_equivalent_total}
                </Text>
              </View>
              <View style={styles.catTrack}>
                <View style={[styles.catFill, { width: `${row.barWidth}%` }]} />
              </View>
            </View>
          ))
        )}
      </GlassPanel>

      <Text style={styles.sectionTitle}>Insights</Text>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        <Text style={styles.insightLine}>
          Default currency: <Text style={styles.insightStrong}>{currency ?? "Not set"}</Text>
        </Text>
        <Text style={styles.insightLine}>
          Profile budget:{" "}
          <Text style={styles.insightStrong}>
            {!Number.isNaN(budget) ? formatMoney(budget, currency) : "Not set"}
          </Text>
        </Text>
      </GlassPanel>
    </>
  );
}
