import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { formatMoney, parseAmount } from "../utils";

export function SubscriptionsScreen() {
  const { state, setCrudOpen, currency } = useHomeData();

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
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
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
                    <Text style={[styles.dataBadge, active ? styles.dataBadgeOn : styles.dataBadgeOff]}>
                      {active ? "Active" : "Inactive"}
                    </Text>
                    <Pressable onPress={() => setCrudOpen({ resource: "subscription", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>
                  {!Number.isNaN(amt) ? formatMoney(amt, ccy) : strField(row.amount)} · {cycle || "—"}
                  {!Number.isNaN(me) ? ` · ${formatMoney(me, ccy)}/mo eq.` : ""}
                </Text>
                <Text style={styles.dataRowFine}>
                  Next renewal: {next}
                  {cat ? ` · ${cat}` : ""}
                </Text>
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
