import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { fmtShortDateTime, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function PaymentsScreen() {
  const { state, setCrudOpen } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Paid at", value: fmtShortDateTime(viewRow.paid_at) },
            { label: "Amount", value: strField(viewRow.amount) },
            { label: "Currency", value: strField(viewRow.currency) || "USD" },
            { label: "Status", value: strField(viewRow.status) || "-" },
            { label: "Source", value: strField(viewRow.source) || "-" },
            { label: "Notes", value: strField(viewRow.notes) || "-" },
          ],
    [viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="payments" />
      <Pressable onPress={() => setCrudOpen({ resource: "payment", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add payment</Text>
      </Pressable>
      <View style={styles.txListWrap}>
        {state.payments.length === 0 ? (
          <Text style={styles.emptyText}>No payment records yet.</Text>
        ) : (
          state.payments.map((row) => {
            const pid = strField(row.id);
            const amt = parseAmount(strField(row.amount));
            const ccy = strField(row.currency) || "USD";
            return (
              <View key={pid} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle}>Payment record</Text>
                  <View style={styles.dataRowTopRight}>
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "payment", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <Text style={styles.dataRowMeta}>{fmtShortDateTime(row.paid_at)}</Text>
                    <View style={styles.txCategoryBadge}>
                      <Text style={styles.txCategoryBadgeText}>
                        {strField(row.status) || "paid"} · {strField(row.source) || "manual"}
                      </Text>
                    </View>
                    {strField(row.notes) ? <Text style={styles.dataRowFine}>{strField(row.notes)}</Text> : null}
                  </View>
                  <Text style={styles.dataRowAmount}>{!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Payment details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
