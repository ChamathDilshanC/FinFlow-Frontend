import "./global.css";

import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider } from "./src/auth/SessionContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
