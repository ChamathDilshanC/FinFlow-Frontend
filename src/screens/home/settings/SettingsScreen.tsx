import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";

function fmt(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeYmdDate(ymd: string): Date {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  if (d.getFullYear() < 2000) return new Date();
  return d;
}

function normalizePickedDate(value: Date): Date {
  if (Number.isNaN(value.getTime()) || value.getFullYear() < 2000) return new Date();
  return value;
}

export function SettingsScreen() {
  const { dateRange, setDateRange, resetDateRange } = useHomeData();
  const [openPicker, setOpenPicker] = useState<"from" | "to" | null>(null);
  const [iosTempDate, setIosTempDate] = useState<Date>(safeYmdDate(dateRange.fromDate));
  const valid = useMemo(() => {
    const from = new Date(`${dateRange.fromDate}T00:00:00`);
    const to = new Date(`${dateRange.toDate}T00:00:00`);
    return from.getTime() <= to.getTime();
  }, [dateRange]);

  const applyPick = (kind: "from" | "to", selectedDate: Date) => {
    const ymd = formatLocalYmd(selectedDate);
    setDateRange(kind === "from" ? { ...dateRange, fromDate: ymd } : { ...dateRange, toDate: ymd });
  };
  const onPick = (kind: "from" | "to") => (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== "ios") setOpenPicker(null);
    if (event.type === "dismissed" || !selectedDate) return;
    applyPick(kind, selectedDate);
  };

  const openNativePicker = (kind: "from" | "to") => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: safeYmdDate(kind === "from" ? dateRange.fromDate : dateRange.toDate),
        mode: "date",
        onChange: onPick(kind),
        maximumDate: kind === "from" ? new Date(`${dateRange.toDate}T23:59:59`) : undefined,
        minimumDate: kind === "to" ? new Date(`${dateRange.fromDate}T00:00:00`) : undefined,
      });
      return;
    }
    setIosTempDate(safeYmdDate(kind === "from" ? dateRange.fromDate : dateRange.toDate));
    setOpenPicker(kind);
  };

  return (
    <>
      <ScreenHeader menuKey="settings" />
      <Text style={styles.pageScreenSub}>
        Choose a global date range. Transactions, payments, subscriptions, budgets, exchange rates, and overview lists will use this range.
      </Text>

      <View style={styles.txListWrap}>
        <View style={styles.dataRow}>
          <Text style={styles.profileFieldLabel}>From date</Text>
          <Pressable style={styles.profileInput} onPress={() => openNativePicker("from")} accessibilityRole="button">
            <Text style={styles.dataRowTitle}>{fmt(dateRange.fromDate)}</Text>
          </Pressable>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.profileFieldLabel}>To date</Text>
          <Pressable style={styles.profileInput} onPress={() => openNativePicker("to")} accessibilityRole="button">
            <Text style={styles.dataRowTitle}>{fmt(dateRange.toDate)}</Text>
          </Pressable>
        </View>

        {!valid ? <Text style={[styles.emptyText, { color: "#dc2626" }]}>From date must be earlier than To date.</Text> : null}

        <View style={[styles.rowActions, { marginTop: 8 }]}>
          <Pressable style={[styles.primaryBtn, { marginTop: 0 }]} onPress={resetDateRange}>
            <Text style={styles.primaryBtnText}>Reset to last 30 days</Text>
          </Pressable>
        </View>
      </View>

      {Platform.OS !== "ios" && openPicker === "from" ? (
        <DateTimePicker
          value={safeYmdDate(dateRange.fromDate)}
          mode="date"
          display="default"
          onChange={onPick("from")}
          maximumDate={new Date(`${dateRange.toDate}T23:59:59`)}
        />
      ) : null}
      {Platform.OS !== "ios" && openPicker === "to" ? (
        <DateTimePicker
          value={safeYmdDate(dateRange.toDate)}
          mode="date"
          display="default"
          onChange={onPick("to")}
          minimumDate={new Date(`${dateRange.fromDate}T00:00:00`)}
        />
      ) : null}
      {Platform.OS === "ios" && openPicker ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpenPicker(null)}>
          <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
            <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.2)" }} onPress={() => setOpenPicker(null)} />
            <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 }}>
                {openPicker === "from" ? "Select from date" : "Select to date"}
              </Text>
              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                themeVariant="light"
                textColor="#0f172a"
                onChange={(_, d) => {
                  if (d) setIosTempDate(normalizePickedDate(d));
                }}
                maximumDate={openPicker === "from" ? new Date(`${dateRange.toDate}T23:59:59`) : undefined}
                minimumDate={openPicker === "to" ? new Date(`${dateRange.fromDate}T00:00:00`) : new Date("2000-01-01T00:00:00")}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <Pressable onPress={() => setOpenPicker(null)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ fontWeight: "700", color: "#64748b" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyPick(openPicker, iosTempDate);
                    setOpenPicker(null);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(91,33,182,0.1)" }}
                >
                  <Text style={{ fontWeight: "800", color: "#5b21b6" }}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
