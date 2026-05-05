import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { categoryNameById, fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function BudgetsScreen() {
  const { state, setCrudOpen } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Budget month", value: fmtShortDate(viewRow.budget_month) },
            { label: "Limit amount", value: strField(viewRow.limit_amount) },
            { label: "Currency", value: strField(viewRow.currency) || "USD" },
            { label: "Category", value: categoryNameById(state.categories, viewRow.category_id) || "Category" },
          ],
    [state.categories, viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="budgets" />
      <Pressable onPress={() => setCrudOpen({ resource: "budget", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add budget</Text>
      </Pressable>
      <View style={styles.txListWrap}>
        {state.budgets.length === 0 ? (
          <Text style={styles.emptyText}>No budget rows for this period.</Text>
        ) : (
          state.budgets.map((row) => {
            const bid = strField(row.id);
            const lim = parseAmount(strField(row.limit_amount));
            const ccy = strField(row.currency) || "USD";
            const catName = categoryNameById(state.categories, row.category_id);
            const catLine = catName || "Category";
            return (
              <View key={bid} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle}>{fmtShortDate(row.budget_month)}</Text>
                  <View style={styles.dataRowTopRight}>
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "budget", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <View style={styles.txCategoryBadge}>
                      <Text style={styles.txCategoryBadgeText}>{catLine}</Text>
                    </View>
                  </View>
                  <Text style={styles.dataRowAmount}>{!Number.isNaN(lim) ? formatMoney(lim, ccy) : strField(row.limit_amount)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Budget details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
