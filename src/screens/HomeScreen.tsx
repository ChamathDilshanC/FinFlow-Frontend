import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useSession } from "../auth/SessionContext";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useSession();

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <Text style={styles.title}>FinFlow</Text>
      <Text style={styles.hint}>Home screen coming next.</Text>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.outline, pressed && styles.outlinePressed]}>
        <Text style={styles.outlineText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050508",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
  },
  hint: {
    marginTop: 10,
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 15,
  },
  outline: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#64748b",
  },
  outlinePressed: {
    opacity: 0.8,
  },
  outlineText: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "600",
  },
});
