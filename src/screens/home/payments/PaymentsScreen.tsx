import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { fmtShortDateTime, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function PaymentsScreen() {
  const { state, setCrudOpen } = useHomeData();

  return (
    <>
      <ScreenHeader menuKey="payments" />
      <Pressable onPress={() => setCrudOpen({ resource: "payment", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add payment</Text>
      </Pressable>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
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
                  <Text style={styles.dataRowTitle}>{fmtShortDateTime(row.paid_at)}</Text>
                  <View style={styles.dataRowTopRight}>
                    <Text style={styles.dataRowAmount}>
                      {!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)}
                    </Text>
                    <Pressable onPress={() => setCrudOpen({ resource: "payment", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>
                  {strField(row.status)} · {strField(row.source)}
                </Text>
                {strField(row.notes) ? <Text style={styles.dataRowFine}>{strField(row.notes)}</Text> : null}
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
