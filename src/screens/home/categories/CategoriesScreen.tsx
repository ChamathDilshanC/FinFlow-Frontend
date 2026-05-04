import { Pressable, Text, View } from "react-native";

import { GlassPanel } from "../../../components/GlassPanel";
import { strField } from "../../../lib/recordFields";
import { ScreenHeader } from "../components/ScreenHeader";
import { homeStyles as styles } from "../homeStyles";
import { useHomeData } from "../HomeDataContext";

export function CategoriesScreen() {
  const { state, setCrudOpen } = useHomeData();

  return (
    <>
      <ScreenHeader menuKey="categories" />
      <Pressable onPress={() => setCrudOpen({ resource: "category", mode: "create" })} style={styles.crudToolbar} accessibilityRole="button">
        <Text style={styles.crudToolbarText}>+ Add category</Text>
      </Pressable>
      <GlassPanel intensity={44} tint="light" borderRadius={18} contentStyle={styles.listCardInner}>
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
                    <View style={[styles.colorSwatch, { backgroundColor: safeColor }]} />
                    <Pressable onPress={() => setCrudOpen({ resource: "category", mode: "edit", row })} hitSlop={8}>
                      <Text style={styles.linkBtn}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.dataRowMeta}>{strField(row.kind) || "both"}</Text>
                {strField(row.icon) ? <Text style={styles.dataRowFine}>Icon: {strField(row.icon)}</Text> : null}
              </View>
            );
          })
        )}
      </GlassPanel>
    </>
  );
}
