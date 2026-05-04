import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { categoryNameById, fmtShortDateTime, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function TransactionsScreen() {
  const { state, setCrudOpen } = useHomeData();

  return (
    <>
      <ScreenHeader menuKey="transactions" />
      <Pressable onPress={() => setCrudOpen({ resource: "transaction", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add transaction</Text>
      </Pressable>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
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
                    <Text style={styles.dataRowAmount}>
                      {!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}
                    </Text>
                    <Pressable onPress={() => setCrudOpen({ resource: "transaction", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>{fmtShortDateTime(row.occurred_at)}</Text>
                {catName ? <Text style={styles.dataRowFine}>Category: {catName}</Text> : null}
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
