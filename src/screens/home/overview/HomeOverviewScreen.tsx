import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { GlassPanel } from "../../../components/GlassPanel";
import { fmtShortDate, fmtShortDateTime, strField } from "../../../lib/recordFields";
import { BLUE, PURPLE, ROSE } from "../homeTheme";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatInt, formatMoney, parseAmount } from "../utils";
import { exportDashboardReport } from "./exportDashboard";

export function HomeOverviewScreen() {
  const { state, setCrudOpen, displayName, currency } = useHomeData();
  const { summary } = state;
  const [isExporting, setIsExporting] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const heroScrollRef = useRef<ScrollView | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const heroGap = 0;
  const heroCardWidth = Math.max(260, screenWidth - 40);
  const heroSnap = heroCardWidth + heroGap;

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

  const recentTransactions = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => new Date(strField(b.occurred_at)).getTime() - new Date(strField(a.occurred_at)).getTime())
      .slice(0, 5);
  }, [state.transactions]);

  const recentSubscriptions = useMemo(() => {
    return [...state.subscriptions]
      .sort(
        (a, b) =>
          new Date(strField(a.next_renewal_date)).getTime() - new Date(strField(b.next_renewal_date)).getTime(),
      )
      .slice(0, 5);
  }, [state.subscriptions]);

  const transactionTrend = useMemo(() => {
    const tx = [...state.transactions]
      .sort((a, b) => new Date(strField(a.occurred_at)).getTime() - new Date(strField(b.occurred_at)).getTime())
      .slice(-7);
    const points = tx.map((row, idx) => ({
      x: idx,
      amount: Math.max(0, parseAmount(strField(row.amount))),
    }));
    const max = Math.max(1, ...points.map((p) => p.amount));
    const chartWidth = 290;
    const chartHeight = 100;
    const line = points
      .map((p) => {
        const x = points.length <= 1 ? 0 : (p.x / (points.length - 1)) * chartWidth;
        const y = chartHeight - (p.amount / max) * chartHeight;
        return `${x},${Number.isFinite(y) ? y : chartHeight}`;
      })
      .join(" ");
    return {
      hasData: points.length > 1,
      line,
      area: points.length > 1 ? `M ${line.replace(/\s+/g, " L ")} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z` : "",
      latestValue: points.length > 0 ? points[points.length - 1].amount : NaN,
    };
  }, [state.transactions]);

  const onExportPress = () => {
    if (isExporting) return;
    Alert.alert("Export dashboard", "Choose a format", [
      {
        text: "Excel (CSV)",
        onPress: () => {
          setIsExporting(true);
          void exportDashboardReport({ state, currency, displayName, format: "excel" })
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : "Export failed";
              Alert.alert("Could not export", msg);
            })
            .finally(() => setIsExporting(false));
        },
      },
      {
        text: "PDF",
        onPress: () => {
          setIsExporting(true);
          void exportDashboardReport({ state, currency, displayName, format: "pdf" })
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : "Export failed";
              Alert.alert("Could not export", msg);
            })
            .finally(() => setIsExporting(false));
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeHeroIndex + 1) % 3;
      heroScrollRef.current?.scrollTo({ x: next * heroSnap, animated: true });
      setActiveHeroIndex(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeHeroIndex, heroSnap]);

  const onHeroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / heroSnap);
    setActiveHeroIndex(Math.max(0, Math.min(2, idx)));
  };

  return (
    <>
      <Text style={styles.greetingKicker}>Dashboard</Text>
      <Text style={styles.greeting}>
        Welcome back, <Text style={styles.greetingName}>{displayName}</Text>
      </Text>
      <Text style={styles.subGreeting}>Your FinFlow snapshot — subscriptions, spend, and budget in one place.</Text>

      <View style={styles.rowActions}>
        <GlassPanel intensity={40} tint="light" borderRadius={14} style={{ flex: 1 }}>
          <Pressable style={styles.glassBtnFill} onPress={onExportPress} accessibilityRole="button">
            <Text style={styles.outlineBtnText}>{isExporting ? "Exporting..." : "Export"}</Text>
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

      <ScrollView
        ref={heroScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.heroCarousel}
        contentContainerStyle={styles.heroCarouselContent}
        snapToInterval={heroSnap}
        pagingEnabled
        decelerationRate="fast"
        onMomentumScrollEnd={onHeroScrollEnd}
      >
        <GlassPanel
          intensity={72}
          tint="dark"
          borderRadius={22}
          style={[styles.heroSlide, { width: heroCardWidth }]}
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
              {summary.limit_warnings.slice(0, 2).map((w, i) => (
                <Text key={i} style={styles.warningItem}>
                  • {w}
                </Text>
              ))}
            </View>
          ) : null}
        </GlassPanel>

        <GlassPanel
          intensity={72}
          tint="dark"
          borderRadius={22}
          style={[styles.heroSlide, { width: heroCardWidth }]}
          contentStyle={styles.heroCardInner}
          tintMultiply="rgba(30,58,138,0.56)"
        >
          <Text style={styles.heroLabel}>Spending pace</Text>
          <Text style={styles.heroScore}>
            {!Number.isNaN(expenseMtd) ? formatMoney(expenseMtd, currency) : "—"}{" "}
            <Text style={styles.heroScoreSub}>spent this month</Text>
          </Text>
          <Text style={styles.heroDetail}>
            {!Number.isNaN(budget) && !Number.isNaN(expenseMtd)
              ? `${Math.max(0, Math.round((expenseMtd / Math.max(1, budget)) * 100))}% of budget consumed so far.`
              : "Set a budget to monitor spending pace across the month."}
          </Text>
          <View style={styles.heroMiniTrack}>
            <View
              style={[
                styles.heroMiniFill,
                { width: `${Math.min(100, !Number.isNaN(budget) && !Number.isNaN(expenseMtd) ? (expenseMtd / Math.max(1, budget)) * 100 : 0)}%` },
              ]}
            />
          </View>
        </GlassPanel>

        <GlassPanel
          intensity={72}
          tint="dark"
          borderRadius={22}
          style={[styles.heroSlide, { width: heroCardWidth }]}
          contentStyle={styles.heroCardInner}
          tintMultiply="rgba(14,116,144,0.58)"
        >
          <Text style={styles.heroLabel}>Account activity</Text>
          <Text style={styles.heroScore}>
            {formatInt(summary.payment_records_total)} <Text style={styles.heroScoreSub}>payments logged</Text>
          </Text>
          <Text style={styles.heroDetail}>
            {summary.active_subscription_count > 0
              ? `${formatInt(summary.active_subscription_count)} active subscriptions tracked in your account.`
              : "No active subscriptions yet. Add one to start tracking renewals."}
          </Text>
          <View style={styles.heroMiniTrack}>
            <View style={[styles.heroMiniFill, { width: `${Math.min(100, summary.active_subscription_count * 10)}%` }]} />
          </View>
        </GlassPanel>
      </ScrollView>
      <View style={styles.heroDots}>
        <View style={[styles.dot, activeHeroIndex === 0 && styles.dotActive]} />
        <View style={[styles.dot, activeHeroIndex === 1 && styles.dotActive]} />
        <View style={[styles.dot, activeHeroIndex === 2 && styles.dotActive]} />
      </View>

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

      <Text style={styles.sectionTitle}>Cashflow trend</Text>
      <Text style={styles.sectionSub}>Last 7 transaction amounts</Text>
      <GlassPanel
        intensity={64}
        tint="dark"
        borderRadius={20}
        style={{ marginBottom: 6 }}
        contentStyle={styles.trendCardInner}
        tintMultiply="rgba(30,58,138,0.55)"
      >
        <View style={styles.trendHeaderRow}>
          <Text style={styles.trendLabel}>Recent movement</Text>
          <Text style={styles.trendAmount}>
            {!Number.isNaN(transactionTrend.latestValue) ? formatMoney(transactionTrend.latestValue, currency) : "—"}
          </Text>
        </View>
        <View style={styles.trendChartWrap}>
          {transactionTrend.hasData ? (
            <Svg width="100%" height={100} viewBox="0 0 290 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#60a5fa" stopOpacity={0.5} />
                  <Stop offset="1" stopColor="#60a5fa" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={transactionTrend.area} fill="url(#trendFill)" />
              <Path d={`M ${transactionTrend.line.replace(/\s+/g, " L ")}`} stroke="#60a5fa" strokeWidth={3} fill="none" />
            </Svg>
          ) : (
            <View style={styles.trendEmptyWrap}>
              <Text style={styles.emptyText}>Need at least 2 transactions to draw trend.</Text>
            </View>
          )}
        </View>
      </GlassPanel>

      <Text style={styles.sectionTitle}>Recent subscriptions</Text>
      <Text style={styles.sectionSub}>Upcoming renewals</Text>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        {recentSubscriptions.length === 0 ? (
          <Text style={styles.emptyText}>No subscriptions yet.</Text>
        ) : (
          recentSubscriptions.map((row) => {
            const name = strField(row.name) || "Subscription";
            const amt = parseAmount(strField(row.amount));
            const ccy = strField(row.currency) || currency || "USD";
            const cycle = strField(row.billing_cycle);
            return (
              <View key={strField(row.id) || name} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle}>{name}</Text>
                  <Text style={styles.recentMeta}>
                    {fmtShortDate(row.next_renewal_date)}{cycle ? ` · ${cycle}` : ""}
                  </Text>
                </View>
                <Text style={styles.recentAmount}>
                  {!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}
                </Text>
              </View>
            );
          })
        )}
      </GlassPanel>

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <Text style={styles.sectionSub}>Latest spending activity</Text>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        {recentTransactions.length === 0 ? (
          <Text style={styles.emptyText}>No recent transactions found.</Text>
        ) : (
          recentTransactions.map((row) => {
            const merchant = strField(row.merchant) || "Expense";
            const amt = parseAmount(strField(row.amount));
            const ccy = strField(row.currency) || currency || "USD";
            return (
              <View key={strField(row.id) || merchant} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle}>{merchant}</Text>
                  <Text style={styles.recentMeta}>{fmtShortDateTime(row.occurred_at)}</Text>
                </View>
                <Text style={styles.recentAmount}>
                  {!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}
                </Text>
              </View>
            );
          })
        )}
      </GlassPanel>

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
