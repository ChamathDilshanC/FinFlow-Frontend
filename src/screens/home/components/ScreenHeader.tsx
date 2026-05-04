import { Text, View } from "react-native";

import { HOME_MENU_ITEMS } from "../menu";
import { homeStyles as styles } from "../homeStyles";
import type { MenuKey } from "../types";

export function ScreenHeader({ menuKey }: { menuKey: Exclude<MenuKey, "overview"> }) {
  const meta = HOME_MENU_ITEMS.find((m) => m.key === menuKey);
  if (!meta) return null;
  return (
    <View>
      <Text style={styles.pageScreenTitle}>{meta.title}</Text>
      <Text style={styles.pageScreenSub}>{meta.subtitle}</Text>
    </View>
  );
}
