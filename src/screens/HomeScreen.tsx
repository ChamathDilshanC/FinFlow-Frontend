import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "../auth/SessionContext";
import { getDashboardSummary, type DashboardSummary } from "../api/dashboard";
import { getProfile, type UserProfile } from "../api/profile";
import {
  getNotificationPreferences,
  listBudgets,
  listCategories,
  listExchangeRates,
  listPayments,
  listSubscriptions,
  listTransactions,
  type NotificationPreferences,
} from "../api/resources";
import { ApiError } from "../api/types";
import { DashboardCornerGlow } from "../components/DashboardCornerGlow";
import { GlassPanel } from "../components/GlassPanel";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

const LOGO = require("../../assets/application/logo.png");

const PAGE = "#ffffff";
const MENU_DRAWER_RADIUS = 24;
const CARD = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const PURPLE = "#5b21b6";
const PURPLE_DARK = "#3b0764";
const BLUE = "#2563eb";
const ROSE = "#e11d48";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function parseAmount(raw: string | null | undefined): number {
  if (raw == null || raw === "") return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function formatMoney(amount: number, currency: string | null): string {
  const code = currency && currency.length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(
      amount,
    );
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function decodeBase64Url(input: string): string {
  const base = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base + "=".repeat((4 - (base.length % 4)) % 4);
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }
  return "";
}

function avatarFromAccessToken(token: string | null, email: string): string {
  if (token) {
    try {
      const payloadRaw = token.split(".")[1];
      if (payloadRaw) {
        const payload = JSON.parse(decodeBase64Url(payloadRaw)) as {
          user_metadata?: { picture?: string; avatar_url?: string };
        };
        const pic = payload.user_metadata?.picture ?? payload.user_metadata?.avatar_url;
        if (pic && typeof pic === "string") {
          return pic;
        }
      }
    } catch {
      // ignore decode failures; fallback avatar will be used.
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayNameFromEmail(email))}&background=5b21b6&color=ffffff&size=128`;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
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

type MenuKey =
  | "overview"
  | "subscriptions"
  | "categories"
  | "transactions"
  | "payments"
  | "budgets"
  | "exchange"
  | "notifications"
  | "profile";

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { hydrated, accessToken, signOut } = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("overview");

  const load = useCallback(async () => {
    if (!accessToken) {
      setState({ status: "error", message: "Not signed in." });
      return;
    }
    setState((s) => (s.status === "ready" ? s : { status: "loading" }));
    try {
      const now = new Date();
      const toDate = now.toISOString().slice(0, 10);
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const fromDate = from.toISOString().slice(0, 10);

      const [profile, summary, subscriptions, categories, transactions, payments, budgets, exchangeRates, preferences] =
        await Promise.all([
          getProfile(accessToken),
          getDashboardSummary(accessToken),
          listSubscriptions(accessToken),
          listCategories(accessToken),
          listTransactions(accessToken),
          listPayments(accessToken),
          listBudgets(accessToken),
          listExchangeRates(accessToken, fromDate, toDate),
          getNotificationPreferences(accessToken),
        ]);
      setState({
        status: "ready",
        profile,
        summary,
        subscriptions,
        categories,
        transactions,
        payments,
        budgets,
        exchangeRates,
        preferences,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not load dashboard";
      setState({ status: "error", message: msg });
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
      return;
    }
    void load();
  }, [hydrated, accessToken, load, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  const categoryBars = useMemo(() => {
    if (state.status !== "ready") return [];
    const rows = state.summary.spend_by_category;
    const nums = rows.map((r) => parseAmount(r.monthly_equivalent_total)).filter((n) => !Number.isNaN(n) && n > 0);
    const max = nums.length ? Math.max(...nums) : 1;
    return rows.map((r) => {
      const v = parseAmount(r.monthly_equivalent_total);
      const w = Number.isNaN(v) || max <= 0 ? 0 : Math.min(100, (v / max) * 100);
      return { ...r, barWidth: w };
    });
  }, [state]);

  if (!hydrated || state.status === "loading") {
    return (
      <View style={styles.page}>
        <DashboardCornerGlow />
        <View style={styles.centered}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingHint}>Loading your dashboard…</Text>
        </View>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
        <DashboardCornerGlow />
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn’t load dashboard</Text>
          <Text style={styles.errorBody}>{state.message}</Text>
          <Pressable onPress={() => void load()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
          <Pressable onPress={onSignOut} style={styles.textBtn}>
            <Text style={styles.textBtnLabel}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, summary } = state;
  const currency = summary.default_currency ?? profile.default_currency;
  const monthlyEq = parseAmount(summary.monthly_equivalent_total);
  const expenseMtd = parseAmount(summary.expense_total_mtd);
  const budget = summary.monthly_budget != null ? parseAmount(summary.monthly_budget) : NaN;
  const remaining = summary.remaining_budget != null ? parseAmount(summary.remaining_budget) : NaN;
  const accountAvatar = avatarFromAccessToken(accessToken, profile.email);
  const menuItems: Array<{ key: MenuKey; title: string; subtitle: string }> = [
    { key: "overview", title: "Overview", subtitle: "Main KPIs and budget health" },
    { key: "subscriptions", title: "Subscriptions", subtitle: "Recurring services and cycles" },
    { key: "categories", title: "Categories", subtitle: "Expense groups and colors" },
    { key: "transactions", title: "Transactions", subtitle: "Recent spending records" },
    { key: "payments", title: "Payments", subtitle: "Paid subscription history" },
    { key: "budgets", title: "Budgets", subtitle: "Category allocation limits" },
    { key: "exchange", title: "Exchange rates", subtitle: "Currency conversion cache" },
    { key: "notifications", title: "Notifications", subtitle: "Renewal reminder settings" },
    { key: "profile", title: "Profile", subtitle: "Account email and defaults" },
  ];

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <DashboardCornerGlow />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        <GlassPanel
          intensity={38}
          tint="light"
          borderRadius={16}
          style={{ marginBottom: 4 }}
          contentStyle={styles.topRowGlass}
        >
          <Pressable onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>☰</Text>
          </Pressable>
          <View style={styles.topRowSpacer} />
          <Image
            source={{ uri: accountAvatar }}
            style={styles.headerAvatar}
            accessibilityIgnoresInvertColors
            accessibilityLabel="Profile picture"
          />
        </GlassPanel>

        <Text style={styles.greeting}>Welcome back, {displayNameFromEmail(profile.email)} 👋</Text>
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
            <Pressable style={styles.glassBtnFill} onPress={() => {}} accessibilityRole="button">
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

        {activeMenu === "overview" && (
          <>
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
          </>
        )}

        {activeMenu !== "overview" && (
          <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
            <Text style={styles.sectionTitleInline}>{
              {
                subscriptions: "Subscriptions",
                categories: "Categories",
                transactions: "Transactions",
                payments: "Payments",
                budgets: "Budgets",
                exchange: "Exchange rates",
                notifications: "Notification preferences",
                profile: "Profile",
                overview: "Overview",
              }[activeMenu]
            }</Text>
            {activeMenu === "subscriptions" && (
              <Text style={styles.insightLine}>
                {["`GET /subscriptions`", " → ", formatInt(state.subscriptions.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "categories" && (
              <Text style={styles.insightLine}>
                {["`GET /categories`", " → ", formatInt(state.categories.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "transactions" && (
              <Text style={styles.insightLine}>
                {["`GET /transactions`", " → ", formatInt(state.transactions.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "payments" && (
              <Text style={styles.insightLine}>
                {["`GET /payments`", " → ", formatInt(state.payments.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "budgets" && (
              <Text style={styles.insightLine}>
                {["`GET /budgets`", " → ", formatInt(state.budgets.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "exchange" && (
              <Text style={styles.insightLine}>
                {["`GET /exchange-rates`", " → ", formatInt(state.exchangeRates.length), " rows"].join("")}
              </Text>
            )}
            {activeMenu === "notifications" && (
              <>
                <Text style={styles.insightLine}>`GET /notifications/preferences`</Text>
                <Text style={styles.insightLine}>Email: {state.preferences.email_enabled ? "enabled" : "disabled"}</Text>
                <Text style={styles.insightLine}>Days before renewal: {state.preferences.days_before_renewal}</Text>
                <Text style={styles.insightLine}>Timezone: {state.preferences.timezone}</Text>
              </>
            )}
            {activeMenu === "profile" && (
              <>
                <Text style={styles.insightLine}>`GET /auth/me`</Text>
                <Text style={styles.insightLine}>Email: {profile.email}</Text>
                <Text style={styles.insightLine}>Currency: {profile.default_currency ?? "Not set"}</Text>
                <Text style={styles.insightLine}>Budget: {!Number.isNaN(budget) ? formatMoney(budget, currency) : "Not set"}</Text>
              </>
            )}
          </GlassPanel>
        )}

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

        <Text style={styles.sectionTitle}>Endpoint catalog</Text>
        <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
          <Text style={styles.endpointLine}>Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`, `PATCH /auth/me/budget`</Text>
          <Text style={styles.endpointLine}>Dashboard: `GET /dashboard/summary`</Text>
          <Text style={styles.endpointLine}>
            {`Subscriptions: GET/POST /subscriptions, GET/PUT/DELETE /subscriptions/{id}`}
          </Text>
          <Text style={styles.endpointLine}>
            {`Categories: GET/POST /categories, GET/PUT/DELETE /categories/{id}`}
          </Text>
          <Text style={styles.endpointLine}>
            {`Transactions: GET/POST /transactions, GET/PUT/DELETE /transactions/{id}`}
          </Text>
          <Text style={styles.endpointLine}>{`Payments: GET/POST /payments, GET/PUT/DELETE /payments/{id}`}</Text>
          <Text style={styles.endpointLine}>{`Budgets: GET/POST /budgets, GET/PUT/DELETE /budgets/{id}`}</Text>
          <Text style={styles.endpointLine}>
            {`Exchange rates: GET/POST /exchange-rates, DELETE /exchange-rates/{id}`}
          </Text>
          <Text style={styles.endpointLine}>Notifications: `GET/PUT /notifications/preferences`</Text>
        </GlassPanel>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuRoot}>
          <View style={styles.menuPanelClip}>
          <GlassPanel
            corners={{ tl: 0, tr: MENU_DRAWER_RADIUS, bl: 0, br: MENU_DRAWER_RADIUS }}
            intensity={68}
            tint="light"
            style={[styles.menuPanel, { paddingTop: insets.top + 10 }]}
            contentStyle={styles.menuPanelInnerWrap}
          >
            <View style={styles.menuBrandRow}>
              <Image source={LOGO} style={styles.menuLogo} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={styles.menuBrandTextCol}>
                <Text style={styles.menuBrandName}>FinFlow</Text>
                <Text style={styles.menuSubtitle}>Navigate your money</Text>
              </View>
            </View>
            <View style={styles.menuItems}>
              {menuItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setActiveMenu(item.key);
                    setMenuOpen(false);
                  }}
                  style={[styles.menuItem, activeMenu === item.key && styles.menuItemActive]}
                >
                  <Text style={[styles.menuItemText, activeMenu === item.key && styles.menuItemTextActive]}>
                    {item.title}
                  </Text>
                  <Text style={styles.menuItemSub}>{item.subtitle}</Text>
                </Pressable>
              ))}
            </View>
            <GlassPanel
              intensity={32}
              tint="light"
              borderRadius={12}
              style={{ marginTop: 6, marginBottom: 8 }}
              tintMultiply="rgba(254,226,226,0.45)"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                onPress={async () => {
                  setMenuOpen(false);
                  await onSignOut();
                }}
                style={styles.menuSignOutInner}
              >
                <Text style={styles.menuSignOutText}>Sign out</Text>
              </Pressable>
            </GlassPanel>
            <GlassPanel intensity={40} tint="light" borderRadius={12} contentStyle={styles.accountCardInner}>
              <Image source={{ uri: accountAvatar }} style={styles.accountAvatar} />
              <View style={styles.accountTextWrap}>
                <Text style={styles.accountName}>{displayNameFromEmail(profile.email)}</Text>
                <Text style={styles.accountEmail}>{profile.email}</Text>
              </View>
            </GlassPanel>
          </GlassPanel>
          </View>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingHint: {
    marginTop: 12,
    color: MUTED,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
  },
  errorBody: {
    marginTop: 8,
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  textBtn: {
    marginTop: 16,
    padding: 8,
  },
  textBtnLabel: {
    color: PURPLE,
    fontWeight: "600",
    fontSize: 15,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  topRowSpacer: {
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9",
  },
  topRowGlass: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.5,
  },
  subGreeting: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },
  rowActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  glassBtnFill: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: CARD,
  },
  outlineBtnText: {
    fontWeight: "700",
    color: TEXT,
    fontSize: 15,
  },
  solidBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  solidBtnText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 15,
  },
  heroCardInner: {
    padding: 20,
  },
  heroLabel: {
    color: "#c4b5fd",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroScore: {
    marginTop: 10,
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  heroScoreSub: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ddd6fe",
  },
  heroDetail: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#e9d5ff",
  },
  warningList: {
    marginTop: 12,
  },
  warningItem: {
    fontSize: 13,
    color: "#fde68a",
    marginTop: 4,
  },
  heroDots: {
    flexDirection: "row",
    marginTop: 18,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#fff",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCardInner: {
    padding: 16,
  },
  metricLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
  },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
  },
  sparkBar: {
    marginTop: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  sparkFill: {
    height: "100%",
    borderRadius: 3,
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 14,
    color: MUTED,
    marginBottom: 10,
  },
  listCardInner: {
    padding: 16,
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 10,
  },
  emptyText: {
    color: MUTED,
    fontSize: 15,
  },
  catRow: {
    marginBottom: 14,
  },
  catLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
    flex: 1,
    marginRight: 8,
  },
  catAmt: {
    fontSize: 14,
    fontWeight: "700",
    color: PURPLE,
  },
  catTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ede9fe",
    overflow: "hidden",
  },
  catFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  insightLine: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 8,
  },
  insightStrong: {
    fontWeight: "700",
    color: TEXT,
  },
  endpointLine: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
    marginBottom: 6,
  },
  menuRoot: {
    flex: 1,
    flexDirection: "row",
  },
  menuPanelClip: {
    width: "75%",
    height: "100%",
    borderTopRightRadius: MENU_DRAWER_RADIUS,
    borderBottomRightRadius: MENU_DRAWER_RADIUS,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 10,
  },
  menuPanel: {
    flex: 1,
    height: "100%",
  },
  menuPanelInnerWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  menuBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  menuLogo: {
    width: 40,
    height: 40,
  },
  menuBrandTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  menuBrandName: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.3,
  },
  menuSubtitle: {
    marginTop: 2,
    marginBottom: 6,
    fontSize: 10,
    color: MUTED,
    lineHeight: 14,
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  menuItemActive: {
    backgroundColor: "rgba(139,92,246,0.14)",
  },
  menuItemText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  menuItemTextActive: {
    color: PURPLE,
  },
  menuItemSub: {
    marginTop: 1,
    fontSize: 10,
    color: "#64748b",
    lineHeight: 13,
  },
  menuSignOutInner: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  menuSignOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
    textAlign: "center",
  },
  accountCardInner: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e2e8f0",
  },
  accountTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  accountName: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
  },
  accountEmail: {
    marginTop: 1,
    fontSize: 10,
    color: MUTED,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
  },
});
