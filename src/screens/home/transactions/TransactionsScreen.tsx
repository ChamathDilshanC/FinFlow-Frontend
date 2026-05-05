import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { categoryNameById, fmtShortDateTime, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function TransactionsScreen() {
  const { state, setCrudOpen } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Merchant", value: strField(viewRow.merchant) || "Expense" },
            { label: "Amount", value: strField(viewRow.amount) },
            { label: "Currency", value: strField(viewRow.currency) || "USD" },
            { label: "Occurred", value: fmtShortDateTime(viewRow.occurred_at) },
            { label: "Notes", value: strField(viewRow.notes) || "-" },
          ],
    [viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="transactions" />
      <Pressable onPress={() => setCrudOpen({ resource: "transaction", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add transaction</Text>
      </Pressable>
      <View style={styles.txListWrap}>
        {state.transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions in the last fetch.</Text>
        ) : (
          state.transactions.map((row) => {
            const tid = strField(row.id);
            const amt = parseAmount(strField(row.amount));
            const ccy = strField(row.currency) || "USD";
            const merchant = strField(row.merchant) || "Expense";
            const catName = categoryNameById(state.categories, row.category_id);
            return (
              <View key={tid || merchant} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle} numberOfLines={1}>
                    {merchant}
                  </Text>
                  <View style={styles.dataRowTopRight}>
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "transaction", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <Text style={styles.dataRowMeta}>{fmtShortDateTime(row.occurred_at)}</Text>
                    {catName ? (
                      <View style={styles.txCategoryBadge}>
                        <Text style={styles.txCategoryBadgeText}>{catName}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.txAmountRed}>{!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Transaction details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
