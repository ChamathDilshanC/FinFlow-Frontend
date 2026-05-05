import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function SubscriptionsScreen() {
  const { state, setCrudOpen, currency } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Name", value: strField(viewRow.name) || "Subscription" },
            { label: "Amount", value: strField(viewRow.amount) },
            { label: "Currency", value: strField(viewRow.currency) || currency || "USD" },
            { label: "Billing cycle", value: strField(viewRow.billing_cycle) || "-" },
            { label: "Category", value: strField(viewRow.category) || "-" },
            { label: "Next renewal", value: fmtShortDate(viewRow.next_renewal_date) },
            { label: "Status", value: viewRow.is_active === true ? "Active" : "Inactive" },
          ],
    [currency, viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="subscriptions" />
      <Pressable
        onPress={() => setCrudOpen({ resource: "subscription", mode: "create" })}
        style={styles.crudToolbar}
        accessibilityRole="button"
      >
        <Text style={styles.crudToolbarText}>+ Add subscription</Text>
      </Pressable>
      <View style={styles.txListWrap}>
        {state.subscriptions.length === 0 ? (
          <Text style={styles.emptyText}>No subscriptions yet.</Text>
        ) : (
          state.subscriptions.map((row) => {
            const sid = strField(row.id);
            const name = strField(row.name) || "Subscription";
            const amt = parseAmount(strField(row.amount));
            const ccy = strField(row.currency) || currency || "USD";
            const cycle = strField(row.billing_cycle);
            const next = fmtShortDate(row.next_renewal_date);
            const cat = strField(row.category);
            const active = row.is_active === true;
            const me = parseAmount(strField(row.monthly_equivalent));
            return (
              <View key={sid || name} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.dataRowTopRight}>
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "subscription", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <Text style={[styles.dataBadge, active ? styles.dataBadgeOn : styles.dataBadgeOff]}>
                      {active ? "Active" : "Inactive"}
                    </Text>
                    <Text style={styles.dataRowMeta}>
                      {cycle || "—"}
                      {!Number.isNaN(me) ? ` · ${formatMoney(me, ccy)}/mo eq.` : ""}
                    </Text>
                    <Text style={styles.dataRowFine}>
                      Next renewal: {next}
                      {cat ? ` · ${cat}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.dataRowAmount}>{!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Subscription details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
