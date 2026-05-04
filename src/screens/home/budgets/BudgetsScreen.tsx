import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { categoryNameById, fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function BudgetsScreen() {
  const { state, setCrudOpen } = useHomeData();

  return (
    <>
      <ScreenHeader menuKey="budgets" />
      <Pressable onPress={() => setCrudOpen({ resource: "budget", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add budget</Text>
      </Pressable>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        {state.budgets.length === 0 ? (
          <Text style={styles.emptyText}>No budget rows for this period.</Text>
        ) : (
          state.budgets.map((row) => {
            const bid = strField(row.id);
            const lim = parseAmount(strField(row.limit_amount));
            const ccy = strField(row.currency) || "USD";
            const catName = categoryNameById(state.categories, row.category_id);
            const cid = strField(row.category_id);
            const catLine = catName ?? (cid ? `Category ${cid.slice(0, 8)}…` : "Category");
            return (
              <View key={bid} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle}>{fmtShortDate(row.budget_month)}</Text>
                  <View style={styles.dataRowTopRight}>
                    <Text style={styles.dataRowAmount}>
                      {!Number.isNaN(lim) ? formatMoney(lim, ccy) : strField(row.limit_amount)}
                    </Text>
                    <Pressable onPress={() => setCrudOpen({ resource: "budget", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>{catLine}</Text>
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
