import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { useSession } from "../../auth/SessionContext";
import { getDashboardSummary, type DashboardSummary } from "../../api/dashboard";
import { getProfile, type UserProfile } from "../../api/profile";
import {
  getNotificationPreferences,
  listBudgets,
  listCategories,
  listExchangeRates,
  listPayments,
  listSubscriptions,
  listTransactions,
  type NotificationPreferences,
} from "../../api/resources";
import { ApiError } from "../../api/types";
import { DashboardCornerGlow } from "../../components/DashboardCornerGlow";
import { GlassPanel } from "../../components/GlassPanel";
import type { RootStackParamList } from "../../navigation/types";
import { BudgetsScreen } from "./budgets/BudgetsScreen";
import { CategoriesScreen } from "./categories/CategoriesScreen";
import { HomeDataProvider, type HomeDataContextValue } from "./HomeDataContext";
import { HomeCrudModal, type HomeCrudOpen } from "./HomeCrudModal";
import { homeStyles as styles } from "./homeStyles";
import { MENU_DRAWER_RADIUS } from "./homeTheme";
import { HOME_MENU_ITEMS } from "./menu";
import { HomeOverviewScreen } from "./overview/HomeOverviewScreen";
import { ExchangeRatesScreen } from "./exchange/ExchangeRatesScreen";
import { NotificationsScreen } from "./notifications/NotificationsScreen";
import { PaymentsScreen } from "./payments/PaymentsScreen";
import { ProfileScreen } from "./profile/ProfileScreen";
import { SettingsScreen } from "./settings/SettingsScreen";
import { SubscriptionsScreen } from "./subscriptions/SubscriptionsScreen";
import { TransactionsScreen } from "./transactions/TransactionsScreen";
import type { HomeDateRange, MenuKey } from "./types";
import { avatarFromAccessToken, displayNameFromEmail } from "./utils";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

const LOGO = require("../../../assets/application/logo.png");

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  days_before_renewal: 7,
  timezone: "UTC",
};

function defaultRange30Days(): HomeDateRange {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const fromDate = from.toISOString().slice(0, 10);
  return { fromDate, toDate };
}

function inRange(isoOrYmd: unknown, range: HomeDateRange): boolean {
  const raw = typeof isoOrYmd === "string" ? isoOrYmd : "";
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const from = new Date(`${range.fromDate}T00:00:00`);
  const to = new Date(`${range.toDate}T23:59:59`);
  return d >= from && d <= to;
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

export function HomeShellScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { hydrated, accessToken, signOut } = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("overview");
  const [crudOpen, setCrudOpen] = useState<HomeCrudOpen | null>(null);
  const [dateRange, setDateRange] = useState<HomeDateRange>(() => defaultRange30Days());

  /** After first successful shell paint (profile + summary), full refresh loads all endpoints together. */
  const shellPrimedRef = useRef(false);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    shellPrimedRef.current = false;
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!accessToken) {
      setState({ status: "error", message: "Not signed in." });
      return;
    }
    const gen = ++loadGenerationRef.current;
    const stale = () => gen !== loadGenerationRef.current;

    setState((s) => (s.status === "ready" ? s : { status: "loading" }));

    try {
      if (!shellPrimedRef.current) {
        const [profile, summary] = await Promise.all([getProfile(accessToken), getDashboardSummary(accessToken)]);
        if (stale()) return;
        shellPrimedRef.current = true;
        setState({
          status: "ready",
          profile,
          summary,
          subscriptions: [],
          categories: [],
          transactions: [],
          payments: [],
          budgets: [],
          exchangeRates: [],
          preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        });

        const { fromDate, toDate } = dateRange;
        try {
          const [subscriptions, categories, transactions, payments, budgets, exchangeRates, preferences] =
            await Promise.all([
              listSubscriptions(accessToken),
              listCategories(accessToken),
              listTransactions(accessToken),
              listPayments(accessToken),
              listBudgets(accessToken),
              listExchangeRates(accessToken, fromDate, toDate),
              getNotificationPreferences(accessToken),
            ]);
          if (stale()) return;
          setState((prev) =>
            prev.status !== "ready"
              ? prev
              : {
                  ...prev,
                  subscriptions,
                  categories,
                  transactions,
                  payments,
                  budgets,
                  exchangeRates,
                  preferences,
                },
          );
        } catch (e2) {
          if (stale()) return;
          const msg = e2 instanceof ApiError ? e2.message : e2 instanceof Error ? e2.message : "Lists failed";
          console.warn("[FinFlow] dashboard lists:", msg);
        }
        return;
      }

      const { fromDate, toDate } = dateRange;
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
      if (stale()) return;
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
      if (stale()) return;
      shellPrimedRef.current = false;
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not load dashboard";
      setState({ status: "error", message: msg });
    }
  }, [accessToken, dateRange]);

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

  const homeDataValue = useMemo((): HomeDataContextValue | null => {
    if (state.status !== "ready" || !accessToken) return null;
    const { profile, summary } = state;
    const currency = summary.default_currency ?? profile.default_currency;
    const accountAvatar = avatarFromAccessToken(accessToken, profile.email);
    const filteredTransactions = state.transactions.filter((r) => inRange(r.occurred_at, dateRange));
    const filteredPayments = state.payments.filter((r) => inRange(r.paid_at, dateRange));
    const filteredBudgets = state.budgets.filter((r) => inRange(r.budget_month, dateRange));
    const filteredExchangeRates = state.exchangeRates.filter((r) => inRange(r.rate_date, dateRange));
    return {
      state: {
        profile: state.profile,
        summary: state.summary,
        subscriptions: state.subscriptions,
        categories: state.categories,
        transactions: filteredTransactions,
        payments: filteredPayments,
        budgets: filteredBudgets,
        exchangeRates: filteredExchangeRates,
        preferences: state.preferences,
      },
      accessToken,
      load,
      currency,
      accountAvatar,
      displayName: displayNameFromEmail(profile.email),
      dateRange,
      setDateRange,
      resetDateRange: () => setDateRange(defaultRange30Days()),
      setCrudOpen,
    };
  }, [state, accessToken, load, dateRange]);

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  if (!hydrated || state.status === "loading") {
    return (
      <View style={styles.page}>
        <DashboardCornerGlow />
        <View style={styles.centered}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color="#5b21b6" />
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
  const accountAvatar = avatarFromAccessToken(accessToken, profile.email);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <DashboardCornerGlow />
      <StatusBar style="dark" />
      <HomeDataProvider value={homeDataValue!}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5b21b6" />}
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

          {activeMenu === "overview" && <HomeOverviewScreen />}
          {activeMenu === "subscriptions" && <SubscriptionsScreen />}
          {activeMenu === "categories" && <CategoriesScreen />}
          {activeMenu === "transactions" && <TransactionsScreen />}
          {activeMenu === "payments" && <PaymentsScreen />}
          {activeMenu === "budgets" && <BudgetsScreen />}
          {activeMenu === "exchange" && <ExchangeRatesScreen />}
          {activeMenu === "notifications" && <NotificationsScreen />}
          {activeMenu === "profile" && <ProfileScreen />}
          {activeMenu === "settings" && <SettingsScreen />}

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
                  {HOME_MENU_ITEMS.map((item) => (
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

        {accessToken ? (
          <HomeCrudModal
            open={crudOpen}
            onClose={() => setCrudOpen(null)}
            accessToken={accessToken}
            categories={state.categories}
            subscriptions={state.subscriptions}
            defaultCurrency={currency}
            onSaved={load}
          />
        ) : null}
      </HomeDataProvider>
    </SafeAreaView>
  );
}
