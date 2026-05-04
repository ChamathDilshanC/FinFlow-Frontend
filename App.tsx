import "./global.css";

import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { WelcomeScreen } from "./src/screens/WelcomeScreen";

/** Temporary shell after welcome until real home is built. */
function MainPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <StatusBar style="light" />
      <Text style={styles.placeholderTitle}>FinFlow</Text>
      <Text style={styles.placeholderHint}>Home screen coming next.</Text>
    </View>
  );
}

export default function App() {
  /** Every cold start opens Welcome first; Next moves to home placeholder for this session. */
  const [showWelcome, setShowWelcome] = useState(true);

  const finishWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  return (
    <SafeAreaProvider>
      {showWelcome ? <WelcomeScreen onContinue={finishWelcome} /> : <MainPlaceholder />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: "#050508",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  placeholderTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
  },
  placeholderHint: {
    marginTop: 10,
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 15,
  },
});
