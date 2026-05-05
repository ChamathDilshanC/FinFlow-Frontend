import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { fmtShortDate, strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";
import { parseAmount } from "../utils";

export function ExchangeRatesScreen() {
  const { state, setCrudOpen } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Date", value: fmtShortDate(viewRow.rate_date) },
            { label: "Base currency", value: strField(viewRow.base_currency) || "-" },
            { label: "Quote currency", value: strField(viewRow.quote_currency) || "-" },
            { label: "Rate", value: strField(viewRow.rate) || "-" },
          ],
    [viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="exchange" />
      <Pressable onPress={() => setCrudOpen({ resource: "exchange", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add / upsert rate</Text>
      </Pressable>
      <View style={styles.txListWrap}>
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
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "exchange", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <Text style={styles.dataRowMeta}>{fmtShortDate(row.rate_date)}</Text>
                  </View>
                  <Text style={styles.dataRowAmount}>{!Number.isNaN(rate) ? rate.toFixed(4) : strField(row.rate)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Exchange rate details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
