import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { parseAmount } from "../utils";

export function ExchangeRatesScreen() {
  const { state, setCrudOpen } = useHomeData();

  return (
    <>
      <ScreenHeader menuKey="exchange" />
      <Pressable onPress={() => setCrudOpen({ resource: "exchange", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add / upsert rate</Text>
      </Pressable>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
        {state.exchangeRates.length === 0 ? (
          <Text style={styles.emptyText}>No exchange rates for the selected date range.</Text>
        ) : (
          state.exchangeRates.map((row) => {
            const eid = strField(row.id);
            const rate = parseAmount(strField(row.rate));
            const baseC = strField(row.base_currency);
            const quoteC = strField(row.quote_currency);
            return (
              <View key={eid} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle}>
                    {baseC}/{quoteC}
                  </Text>
                  <View style={styles.dataRowTopRight}>
                    <Text style={styles.dataRowAmount}>
                      {!Number.isNaN(rate) ? rate.toFixed(4) : strField(row.rate)}
                    </Text>
                    <Pressable onPress={() => setCrudOpen({ resource: "exchange", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>{fmtShortDate(row.rate_date)}</Text>
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
