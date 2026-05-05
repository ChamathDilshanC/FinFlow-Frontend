import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { RecordDetailsModal } from "../components/RecordDetailsModal";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";

export function CategoriesScreen() {
  const { state, setCrudOpen } = useHomeData();
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const viewFields = useMemo(
    () =>
      !viewRow
        ? []
        : [
            { label: "Name", value: strField(viewRow.name) || "Category" },
            { label: "Kind", value: strField(viewRow.kind) || "both" },
            { label: "Color", value: strField(viewRow.color) || "-" },
            { label: "Icon", value: strField(viewRow.icon) || "-" },
          ],
    [viewRow],
  );

  return (
    <>
      <ScreenHeader menuKey="categories" />
      <Pressable onPress={() => setCrudOpen({ resource: "category", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add category</Text>
      </Pressable>
      <View style={styles.txListWrap}>
        {state.categories.length === 0 ? (
          <Text style={styles.emptyText}>No categories yet.</Text>
        ) : (
          state.categories.map((row) => {
            const cid = strField(row.id);
            const hex = strField(row.color);
            const safeColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex) ? hex : "#94a3b8";
            return (
              <View key={cid || strField(row.name)} style={styles.dataRow}>
                <View style={styles.dataRowTop}>
                  <Text style={styles.dataRowTitle}>{strField(row.name) || "Category"}</Text>
                  <View style={styles.dataRowTopRight}>
                    <Pressable onPress={() => setViewRow(row)} style={styles.viewBtn} accessibilityRole="button">
                      <Text style={styles.viewBtnText}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => setCrudOpen({ resource: "category", mode: "edit", row })} hitSlop={8} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✎</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.txDivider} />
                <View style={styles.txBottomRow}>
                  <View style={styles.txMetaCol}>
                    <View style={styles.txCategoryBadge}>
                      <Text style={styles.txCategoryBadgeText}>{strField(row.kind) || "both"}</Text>
                    </View>
                    {strField(row.icon) ? <Text style={styles.dataRowFine}>Icon: {strField(row.icon)}</Text> : null}
                  </View>
                  <View style={[styles.colorSwatch, { backgroundColor: safeColor }]} />
                </View>
              </View>
            );
          })
        )}
      </View>
      <RecordDetailsModal visible={!!viewRow} title="Category details" fields={viewFields} onClose={() => setViewRow(null)} />
    </>
  );
}
