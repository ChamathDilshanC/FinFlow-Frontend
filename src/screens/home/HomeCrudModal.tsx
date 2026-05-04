import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { BillingCycle, CategoryKind, PaymentSource, PaymentStatus } from "../../api/resources";
import {
  createBudget,
  createCategory,
  createPayment,
  createSubscription,
  createTransaction,
  deleteBudget,
  deleteCategory,
  deleteExchangeRate,
  deletePayment,
  deleteSubscription,
  deleteTransaction,
  updateBudget,
  updateCategory,
  updatePayment,
  updateSubscription,
  updateTransaction,
  upsertExchangeRate,
} from "../../api/resources";
import { ApiError } from "../../api/types";
import { strField } from "../../lib/recordFields";
import { CATEGORY_COLOR_PICKLIST } from "./categoryColorPicklist";
import { CATEGORY_ICON_PICKLIST } from "./categoryIconPicklist";

const TEXT = "#0f172a";
const MUTED = "#64748b";
const PURPLE = "#5b21b6";

export type HomeCrudOpen =
  | null
  | { resource: "subscription"; mode: "create" | "edit"; row?: Record<string, unknown> }
  | { resource: "category"; mode: "create" | "edit"; row?: Record<string, unknown> }
  | { resource: "transaction"; mode: "create" | "edit"; row?: Record<string, unknown> }
  | { resource: "payment"; mode: "create" | "edit"; row?: Record<string, unknown> }
  | { resource: "budget"; mode: "create" | "edit"; row?: Record<string, unknown> }
  | { resource: "exchange"; mode: "create" | "edit"; row?: Record<string, unknown> };

type Props = {
  open: HomeCrudOpen | null;
  onClose: () => void;
  accessToken: string;
  categories: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
  defaultCurrency: string | null;
  /** Called after a successful mutation; not awaited so the sheet can close immediately. */
  onSaved: () => void | Promise<void>;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNow(): string {
  return new Date().toISOString();
}

function parseLocalYmd(ymd: string): Date {
  const parts = ymd.split("-").map((x) => Number.parseInt(x, 10));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

function addMonthsLocal(d: Date, months: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setMonth(x.getMonth() + months);
  return x;
}

/** First renewal after `startYmd`: start + one billing period (local calendar dates). */
function computeNextRenewal(startYmd: string, cycle: BillingCycle): string {
  const base = parseLocalYmd(startYmd);
  if (Number.isNaN(base.getTime())) return "";
  switch (cycle) {
    case "weekly":
      return formatLocalYmd(addDaysLocal(base, 7));
    case "monthly":
      return formatLocalYmd(addMonthsLocal(base, 1));
    case "quarterly":
      return formatLocalYmd(addMonthsLocal(base, 3));
    case "yearly":
      return formatLocalYmd(addMonthsLocal(base, 12));
    default:
      return formatLocalYmd(addMonthsLocal(base, 1));
  }
}

type SubRenewalBaseline =
  | { kind: "create" }
  | { kind: "edit"; start: string; cycle: BillingCycle; next: string };

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { k: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.fieldBlock}>
      <Text style={s.label}>{label}</Text>
      <View style={s.chipWrap}>
        {options.map((o) => (
          <Pressable key={o.k} onPress={() => onChange(o.k)} style={[s.chip, value === o.k && s.chipOn]}>
            <Text style={[s.chipText, value === o.k && s.chipTextOn]}>{o.l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "characters";
}) {
  return (
    <View style={s.fieldBlock}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={s.input}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export function HomeCrudModal({ open, onClose, accessToken, categories, subscriptions: subRows, defaultCurrency, onSaved }: Props) {
  const [busy, setBusy] = useState(false);

  const dc = defaultCurrency && defaultCurrency.length === 3 ? defaultCurrency : "USD";

  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCurrency, setSubCurrency] = useState("USD");
  const [subCycle, setSubCycle] = useState<BillingCycle>("monthly");
  const [subCategory, setSubCategory] = useState("");
  const [subLimit, setSubLimit] = useState("");
  const [subStart, setSubStart] = useState(todayIsoDate());
  const [subNext, setSubNext] = useState("");
  const [subActive, setSubActive] = useState(true);
  const [subNotes, setSubNotes] = useState("");

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catKind, setCatKind] = useState<CategoryKind>("both");

  const [txCatId, setTxCatId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState("USD");
  const [txOccurred, setTxOccurred] = useState(isoNow());
  const [txMerchant, setTxMerchant] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const [paySubId, setPaySubId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("USD");
  const [payPaidAt, setPayPaidAt] = useState(isoNow());
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [payStatus, setPayStatus] = useState<PaymentStatus>("paid");
  const [paySource, setPaySource] = useState<PaymentSource>("manual");
  const [payNotes, setPayNotes] = useState("");

  const [budCatId, setBudCatId] = useState("");
  const [budMonth, setBudMonth] = useState(todayIsoDate().slice(0, 7) + "-01");
  const [budLimit, setBudLimit] = useState("");
  const [budCurrency, setBudCurrency] = useState("USD");

  const [exDate, setExDate] = useState(todayIsoDate());
  const [exBase, setExBase] = useState("USD");
  const [exQuote, setExQuote] = useState("EUR");
  const [exRate, setExRate] = useState("");

  const subRenewalBaseline = useRef<SubRenewalBaseline | null>(null);

  const resetFromOpen = useCallback(() => {
    if (!open) return;
    if (open.resource === "subscription") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        const start = strField(r.start_date).slice(0, 10) || todayIsoDate();
        const cycle = (strField(r.billing_cycle) as BillingCycle) || "monthly";
        const next = r.next_renewal_date ? strField(r.next_renewal_date).slice(0, 10) : "";
        subRenewalBaseline.current = { kind: "edit", start, cycle, next };
        setSubName(strField(r.name));
        setSubAmount(strField(r.amount));
        setSubCurrency(strField(r.currency) || dc);
        setSubCycle(cycle);
        setSubCategory(strField(r.category));
        setSubLimit(r.monthly_limit != null ? strField(r.monthly_limit) : "");
        setSubStart(start);
        setSubNext(next);
        setSubActive(r.is_active === true);
        setSubNotes(strField(r.notes));
      } else {
        subRenewalBaseline.current = { kind: "create" };
        setSubName("");
        setSubAmount("");
        setSubCurrency(dc);
        setSubCycle("monthly");
        setSubCategory("");
        setSubLimit("");
        setSubStart(todayIsoDate());
        setSubNext("");
        setSubActive(true);
        setSubNotes("");
      }
    }
    if (open.resource === "category") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        setCatName(strField(r.name));
        setCatIcon(strField(r.icon));
        setCatColor(strField(r.color) || "#6366f1");
        setCatKind((strField(r.kind) as CategoryKind) || "both");
      } else {
        setCatName("");
        setCatIcon("");
        setCatColor("#6366f1");
        setCatKind("both");
      }
    }
    if (open.resource === "transaction") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        setTxCatId(strField(r.category_id));
        setTxAmount(strField(r.amount));
        setTxCurrency(strField(r.currency) || "USD");
        setTxOccurred(strField(r.occurred_at) || isoNow());
        setTxMerchant(strField(r.merchant));
        setTxNotes(strField(r.notes));
      } else {
        setTxCatId("");
        setTxAmount("");
        setTxCurrency(dc);
        setTxOccurred(isoNow());
        setTxMerchant("");
        setTxNotes("");
      }
    }
    if (open.resource === "payment") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        setPaySubId(strField(r.subscription_id));
        setPayAmount(strField(r.amount));
        setPayCurrency(strField(r.currency) || "USD");
        setPayPaidAt(strField(r.paid_at) || isoNow());
        setPayPeriodStart(r.period_start ? strField(r.period_start).slice(0, 10) : "");
        setPayPeriodEnd(r.period_end ? strField(r.period_end).slice(0, 10) : "");
        setPayStatus((strField(r.status) as PaymentStatus) || "paid");
        setPaySource((strField(r.source) as PaymentSource) || "manual");
        setPayNotes(strField(r.notes));
      } else {
        setPaySubId("");
        setPayAmount("");
        setPayCurrency(dc);
        setPayPaidAt(isoNow());
        setPayPeriodStart("");
        setPayPeriodEnd("");
        setPayStatus("paid");
        setPaySource("manual");
        setPayNotes("");
      }
    }
    if (open.resource === "budget") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        setBudCatId(strField(r.category_id));
        setBudMonth(strField(r.budget_month).slice(0, 10) || todayIsoDate().slice(0, 7) + "-01");
        setBudLimit(strField(r.limit_amount));
        setBudCurrency(strField(r.currency) || "USD");
      } else {
        setBudCatId("");
        setBudMonth(todayIsoDate().slice(0, 7) + "-01");
        setBudLimit("");
        setBudCurrency(dc);
      }
    }
    if (open.resource === "exchange") {
      const r = open.row;
      if (open.mode === "edit" && r) {
        setExDate(strField(r.rate_date).slice(0, 10) || todayIsoDate());
        setExBase(strField(r.base_currency) || "USD");
        setExQuote(strField(r.quote_currency) || "EUR");
        setExRate(strField(r.rate));
      } else {
        setExDate(todayIsoDate());
        setExBase("USD");
        setExQuote("EUR");
        setExRate("");
      }
    }
  }, [open, dc]);

  useEffect(() => {
    resetFromOpen();
  }, [resetFromOpen]);

  useEffect(() => {
    if (!open || open.resource !== "subscription") return;
    const ymd = subStart.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    if (Number.isNaN(parseLocalYmd(ymd).getTime())) return;
    const b = subRenewalBaseline.current;
    if (!b) return;
    if (b.kind === "edit" && ymd === b.start && subCycle === b.cycle) {
      setSubNext(b.next);
      return;
    }
    setSubNext(computeNextRenewal(ymd, subCycle));
  }, [open, subStart, subCycle]);

  const title = useMemo(() => {
    if (!open) return "";
    const m = open.mode === "create" ? "Add" : "Edit";
    const labels: Record<string, string> = {
      subscription: "Subscription",
      category: "Category",
      transaction: "Transaction",
      payment: "Payment",
      budget: "Budget",
      exchange: "Exchange rate",
    };
    return `${m} ${labels[open.resource] ?? ""}`;
  }, [open]);

  /** Subscription `category` is a string on the API; align with category names from `/categories`. */
  const subscriptionCategoryPickList = useMemo(() => {
    const forSubs = categories.filter((c) => {
      const k = strField(c.kind);
      return !k || k === "subscription" || k === "both";
    });
    const list = forSubs.length > 0 ? forSubs : categories;
    return list.map((c) => ({ id: strField(c.id), name: strField(c.name) || strField(c.id) }));
  }, [categories]);

  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Request failed");

  const save = async () => {
    if (!open) return;
    setBusy(true);
    let succeeded = false;
    try {
      if (open.resource === "subscription") {
        const amount = Number(subAmount);
        if (!subName.trim() || Number.isNaN(amount) || amount <= 0) {
          Alert.alert("Validation", "Name and a positive amount are required.");
          setBusy(false);
          return;
        }
        const ml = subLimit.trim() === "" ? null : Number(subLimit);
        const body = {
          name: subName.trim(),
          amount,
          currency: subCurrency.trim().toUpperCase().slice(0, 3) || "USD",
          billing_cycle: subCycle,
          category: subCategory.trim() || null,
          monthly_limit: ml != null && !Number.isNaN(ml) && ml >= 0 ? ml : null,
          start_date: subStart.trim(),
          next_renewal_date: subNext.trim() || null,
          is_active: subActive,
          notes: subNotes.trim() || null,
        };
        if (open.mode === "create") await createSubscription(accessToken, body);
        else await updateSubscription(accessToken, strField(open.row?.id), body);
      }
      if (open.resource === "category") {
        if (!catName.trim()) {
          Alert.alert("Validation", "Name is required.");
          setBusy(false);
          return;
        }
        const body = {
          name: catName.trim(),
          icon: catIcon.trim() || null,
          color: catColor.trim() || null,
          kind: catKind,
        };
        if (open.mode === "create") await createCategory(accessToken, body);
        else await updateCategory(accessToken, strField(open.row?.id), body);
      }
      if (open.resource === "transaction") {
        const amount = Number(txAmount);
        if (Number.isNaN(amount) || amount <= 0) {
          Alert.alert("Validation", "Amount must be a positive number.");
          setBusy(false);
          return;
        }
        const body = {
          category_id: txCatId.trim() || null,
          amount,
          currency: txCurrency.trim().toUpperCase().slice(0, 3) || "USD",
          occurred_at: txOccurred.trim(),
          merchant: txMerchant.trim() || null,
          notes: txNotes.trim() || null,
        };
        if (open.mode === "create") await createTransaction(accessToken, body);
        else await updateTransaction(accessToken, strField(open.row?.id), body);
      }
      if (open.resource === "payment") {
        const amount = Number(payAmount);
        if (Number.isNaN(amount) || amount <= 0) {
          Alert.alert("Validation", "Amount must be a positive number.");
          setBusy(false);
          return;
        }
        const body = {
          subscription_id: paySubId.trim() || null,
          amount,
          currency: payCurrency.trim().toUpperCase().slice(0, 3) || "USD",
          paid_at: payPaidAt.trim(),
          period_start: payPeriodStart.trim() || null,
          period_end: payPeriodEnd.trim() || null,
          status: payStatus,
          source: paySource,
          notes: payNotes.trim() || null,
        };
        if (open.mode === "create") await createPayment(accessToken, body);
        else await updatePayment(accessToken, strField(open.row?.id), body);
      }
      if (open.resource === "budget") {
        if (!budCatId.trim()) {
          Alert.alert("Validation", "Pick a category.");
          setBusy(false);
          return;
        }
        const lim = Number(budLimit);
        if (Number.isNaN(lim) || lim <= 0) {
          Alert.alert("Validation", "Limit must be a positive number.");
          setBusy(false);
          return;
        }
        const body = {
          category_id: budCatId.trim(),
          budget_month: budMonth.trim(),
          limit_amount: lim,
          currency: budCurrency.trim().toUpperCase().slice(0, 3) || "USD",
        };
        if (open.mode === "create") await createBudget(accessToken, body);
        else await updateBudget(accessToken, strField(open.row?.id), body);
      }
      if (open.resource === "exchange") {
        const rate = Number(exRate);
        if (Number.isNaN(rate) || rate <= 0) {
          Alert.alert("Validation", "Rate must be a positive number.");
          setBusy(false);
          return;
        }
        await upsertExchangeRate(accessToken, {
          rate_date: exDate.trim(),
          base_currency: exBase.trim().toUpperCase().slice(0, 3),
          quote_currency: exQuote.trim().toUpperCase().slice(0, 3),
          rate,
        });
      }
      succeeded = true;
    } catch (e) {
      Alert.alert("Could not save", errMsg(e));
    } finally {
      setBusy(false);
    }
    if (succeeded) {
      onClose();
      void onSaved();
    }
  };

  const confirmDelete = () => {
    if (!open || open.mode !== "edit" || !open.row) return;
    const id = strField(open.row.id);
    Alert.alert("Delete", "Delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          let ok = false;
          try {
            if (open.resource === "subscription") await deleteSubscription(accessToken, id);
            if (open.resource === "category") await deleteCategory(accessToken, id);
            if (open.resource === "transaction") await deleteTransaction(accessToken, id);
            if (open.resource === "payment") await deletePayment(accessToken, id);
            if (open.resource === "budget") await deleteBudget(accessToken, id);
            if (open.resource === "exchange") await deleteExchangeRate(accessToken, id);
            ok = true;
          } catch (e) {
            Alert.alert("Could not delete", errMsg(e));
          } finally {
            setBusy(false);
          }
          if (ok) {
            onClose();
            void onSaved();
          }
        },
      },
    ]);
  };

  if (!open) return null;

  const showDelete = open.mode === "edit" && !!strField(open.row?.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} accessibilityLabel="Sheet" />
          <Text style={s.sheetTitle}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {open.resource === "subscription" && (
              <>
                <Field label="Name" value={subName} onChangeText={setSubName} />
                <Field label="Amount" value={subAmount} onChangeText={setSubAmount} keyboardType="decimal-pad" />
                <Field label="Currency (ISO)" value={subCurrency} onChangeText={setSubCurrency} autoCapitalize="characters" />
                <ChipRow
                  label="Billing cycle"
                  value={subCycle}
                  onChange={(v) => setSubCycle(v as BillingCycle)}
                  options={[
                    { k: "weekly", l: "Weekly" },
                    { k: "monthly", l: "Monthly" },
                    { k: "quarterly", l: "Quarterly" },
                    { k: "yearly", l: "Yearly" },
                  ]}
                />
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Category (optional)</Text>
                  <Text style={s.hint}>Choose a saved category or type a custom label.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catPickScroll}>
                    <Pressable
                      onPress={() => setSubCategory("")}
                      style={[s.catPick, subCategory === "" && s.catPickOn]}
                    >
                      <Text style={[s.catPickText, subCategory === "" && s.catPickTextOn]}>None</Text>
                    </Pressable>
                    {subscriptionCategoryPickList.map((row) => {
                      const sel = subCategory === row.name;
                      return (
                        <Pressable
                          key={row.id}
                          onPress={() => setSubCategory(row.name)}
                          style={[s.catPick, sel && s.catPickOn]}
                        >
                          <Text style={[s.catPickText, sel && s.catPickTextOn]} numberOfLines={1}>
                            {row.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Field
                    label="Custom label (optional)"
                    value={subCategory}
                    onChangeText={setSubCategory}
                    placeholder="Same as picker, or any text"
                  />
                </View>
                <Field label="Monthly limit (optional)" value={subLimit} onChangeText={setSubLimit} keyboardType="decimal-pad" />
                <Field label="Start date (YYYY-MM-DD)" value={subStart} onChangeText={setSubStart} />
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Next renewal</Text>
                  <Text style={s.hint}>Filled from billing cycle + start date; you can edit if needed.</Text>
                  <Field label="Date (YYYY-MM-DD)" value={subNext} onChangeText={setSubNext} placeholder="Auto" />
                </View>
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Active</Text>
                  <Switch value={subActive} onValueChange={setSubActive} />
                </View>
                <Field label="Notes" value={subNotes} onChangeText={setSubNotes} multiline />
              </>
            )}
            {open.resource === "category" && (
              <>
                <Field label="Name" value={catName} onChangeText={setCatName} />
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Icon (optional)</Text>
                  <Text style={s.hint}>Tap an emoji, or type your own below.</Text>
                  <View style={s.iconGrid}>
                    <Pressable
                      onPress={() => setCatIcon("")}
                      style={[s.iconPick, catIcon === "" && s.iconPickOn]}
                      accessibilityLabel="No icon"
                    >
                      <Text style={s.iconPickClear}>—</Text>
                    </Pressable>
                    {CATEGORY_ICON_PICKLIST.map((emoji) => {
                      const on = catIcon === emoji;
                      return (
                        <Pressable
                          key={emoji}
                          onPress={() => setCatIcon(emoji)}
                          style={[s.iconPick, on && s.iconPickOn]}
                          accessibilityLabel={`Icon ${emoji}`}
                        >
                          <Text style={s.iconEmoji}>{emoji}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Field
                    label="Custom icon (optional)"
                    value={catIcon}
                    onChangeText={setCatIcon}
                    placeholder="Emoji or short text"
                  />
                </View>
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Color</Text>
                  <Text style={s.hint}>Tap a swatch. Custom hex only if you need an exact color.</Text>
                  <View style={s.colorGrid}>
                    {CATEGORY_COLOR_PICKLIST.map((hex) => {
                      const selected = catColor.trim().toLowerCase() === hex.toLowerCase();
                      return (
                        <Pressable
                          key={hex}
                          onPress={() => setCatColor(hex)}
                          style={[s.colorSwatchOuter, selected && s.colorSwatchOuterOn]}
                          accessibilityLabel={`Color ${hex}`}
                        >
                          <View style={[s.colorSwatchInner, { backgroundColor: hex }]} />
                        </Pressable>
                      );
                    })}
                  </View>
                  <Field
                    label="Custom hex (optional)"
                    value={catColor}
                    onChangeText={setCatColor}
                    autoCapitalize="none"
                    placeholder="#6366f1"
                  />
                </View>
                <ChipRow
                  label="Kind"
                  value={catKind}
                  onChange={(v) => setCatKind(v as CategoryKind)}
                  options={[
                    { k: "subscription", l: "Subscription" },
                    { k: "expense", l: "Expense" },
                    { k: "both", l: "Both" },
                  ]}
                />
              </>
            )}
            {open.resource === "transaction" && (
              <>
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Category (optional)</Text>
                  <Text style={s.hint}>Pick from your categories or paste a UUID.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catPickScroll}>
                    <Pressable onPress={() => setTxCatId("")} style={[s.catPick, txCatId === "" && s.catPickOn]}>
                      <Text style={[s.catPickText, txCatId === "" && s.catPickTextOn]}>None</Text>
                    </Pressable>
                    {categories.map((c) => {
                      const id = strField(c.id);
                      const nm = strField(c.name) || id.slice(0, 8);
                      const sel = txCatId === id;
                      return (
                        <Pressable key={id} onPress={() => setTxCatId(id)} style={[s.catPick, sel && s.catPickOn]}>
                          <Text style={[s.catPickText, sel && s.catPickTextOn]} numberOfLines={1}>
                            {nm}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Field
                    label="Or paste category UUID"
                    value={txCatId}
                    onChangeText={setTxCatId}
                    placeholder="UUID"
                    autoCapitalize="none"
                  />
                </View>
                <Field label="Amount" value={txAmount} onChangeText={setTxAmount} keyboardType="decimal-pad" />
                <Field label="Currency" value={txCurrency} onChangeText={setTxCurrency} autoCapitalize="characters" />
                <Field label="Occurred at (ISO datetime)" value={txOccurred} onChangeText={setTxOccurred} autoCapitalize="none" />
                <Field label="Merchant" value={txMerchant} onChangeText={setTxMerchant} />
                <Field label="Notes" value={txNotes} onChangeText={setTxNotes} multiline />
              </>
            )}
            {open.resource === "payment" && (
              <>
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Subscription (optional)</Text>
                  <Text style={s.hint}>Pick a subscription or paste its UUID.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catPickScroll}>
                    <Pressable onPress={() => setPaySubId("")} style={[s.catPick, paySubId === "" && s.catPickOn]}>
                      <Text style={[s.catPickText, paySubId === "" && s.catPickTextOn]}>None</Text>
                    </Pressable>
                    {subRows.map((su) => {
                      const id = strField(su.id);
                      const nm = strField(su.name) || id.slice(0, 8);
                      const sel = paySubId === id;
                      return (
                        <Pressable key={id} onPress={() => setPaySubId(id)} style={[s.catPick, sel && s.catPickOn]}>
                          <Text style={[s.catPickText, sel && s.catPickTextOn]} numberOfLines={1}>
                            {nm}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Field
                    label="Or paste subscription UUID"
                    value={paySubId}
                    onChangeText={setPaySubId}
                    placeholder="UUID"
                    autoCapitalize="none"
                  />
                </View>
                <Field label="Amount" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" />
                <Field label="Currency" value={payCurrency} onChangeText={setPayCurrency} autoCapitalize="characters" />
                <Field label="Paid at (ISO datetime)" value={payPaidAt} onChangeText={setPayPaidAt} autoCapitalize="none" />
                <Field label="Period start (YYYY-MM-DD, optional)" value={payPeriodStart} onChangeText={setPayPeriodStart} />
                <Field label="Period end (YYYY-MM-DD, optional)" value={payPeriodEnd} onChangeText={setPayPeriodEnd} />
                <ChipRow
                  label="Status"
                  value={payStatus}
                  onChange={(v) => setPayStatus(v as PaymentStatus)}
                  options={[
                    { k: "paid", l: "Paid" },
                    { k: "pending", l: "Pending" },
                    { k: "failed", l: "Failed" },
                    { k: "cancelled", l: "Cancelled" },
                  ]}
                />
                <ChipRow
                  label="Source"
                  value={paySource}
                  onChange={(v) => setPaySource(v as PaymentSource)}
                  options={[
                    { k: "manual", l: "Manual" },
                    { k: "import", l: "Import" },
                    { k: "system", l: "System" },
                  ]}
                />
                <Field label="Notes" value={payNotes} onChangeText={setPayNotes} multiline />
              </>
            )}
            {open.resource === "budget" && (
              <>
                <View style={s.fieldBlock}>
                  <Text style={s.label}>Category</Text>
                  <Text style={s.hint}>Required — choose the category this budget applies to.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catPickScroll}>
                    {categories.map((c) => {
                      const id = strField(c.id);
                      const nm = strField(c.name) || id;
                      const sel = budCatId === id;
                      return (
                        <Pressable key={id} onPress={() => setBudCatId(id)} style={[s.catPick, sel && s.catPickOn]}>
                          <Text style={[s.catPickText, sel && s.catPickTextOn]} numberOfLines={1}>
                            {nm}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <Field label="Budget month (YYYY-MM-DD)" value={budMonth} onChangeText={setBudMonth} />
                <Field label="Limit amount" value={budLimit} onChangeText={setBudLimit} keyboardType="decimal-pad" />
                <Field label="Currency" value={budCurrency} onChangeText={setBudCurrency} autoCapitalize="characters" />
              </>
            )}
            {open.resource === "exchange" && (
              <>
                <Field label="Rate date (YYYY-MM-DD)" value={exDate} onChangeText={setExDate} />
                <Field label="Base currency" value={exBase} onChangeText={setExBase} autoCapitalize="characters" />
                <Field label="Quote currency" value={exQuote} onChangeText={setExQuote} autoCapitalize="characters" />
                <Field label="Rate" value={exRate} onChangeText={setExRate} keyboardType="decimal-pad" />
                <View style={s.fieldBlock}>
                  <Text style={s.hint}>Saves by date and currency pair (matches backend).</Text>
                </View>
              </>
            )}
          </ScrollView>
          <View style={s.actions}>
            {showDelete ? (
              <Pressable onPress={confirmDelete} style={s.dangerBtn} disabled={busy}>
                <Text style={s.dangerBtnText}>Delete</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} style={s.secondaryBtn} disabled={busy}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => void save()} style={s.primaryBtn} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Save</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(148, 163, 184, 0.35)" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#fafbfc",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(226, 232, 240, 0.9)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  scroll: { paddingBottom: 20 },
  /** Consistent vertical rhythm between form blocks */
  fieldBlock: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT,
    minHeight: 48,
    backgroundColor: "#fff",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipOn: { backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" },
  chipText: { fontSize: 13, fontWeight: "600", color: MUTED },
  chipTextOn: { color: PURPLE },
  catPickScroll: { marginBottom: 14, maxHeight: 48 },
  catPick: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxWidth: 168,
  },
  catPickOn: { backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" },
  catPickText: { fontSize: 13, fontWeight: "600", color: TEXT },
  catPickTextOn: { color: PURPLE },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  iconPick: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPickOn: { backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" },
  iconEmoji: { fontSize: 22 },
  iconPickClear: { fontSize: 16, fontWeight: "700", color: MUTED },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  colorSwatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 3,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchOuterOn: {
    borderColor: PURPLE,
    backgroundColor: "rgba(91, 33, 182, 0.06)",
  },
  colorSwatchInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)",
  },
  hint: { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 10, marginTop: 2 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 4,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  primaryBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  secondaryBtnText: { color: MUTED, fontWeight: "600", fontSize: 15 },
  dangerBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  dangerBtnText: { color: "#b91c1c", fontWeight: "700", fontSize: 14 },
});
