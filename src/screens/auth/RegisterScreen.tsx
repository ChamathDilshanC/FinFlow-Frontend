import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../api/types";
import { useSession } from "../../auth/SessionContext";
import { GlassPanel } from "../../components/GlassPanel";
import { GoogleLogo } from "../../components/GoogleLogo";
import { OnboardingRadialBackdrop } from "../../components/OnboardingRadialBackdrop";
import type { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Register">;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { signUpEmail, signInGoogle } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      Alert.alert("Email", "Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Password", "Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await signUpEmail(normalizedEmail, password);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Sign up failed";
      Alert.alert("Could not register", msg);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInGoogle();
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      Alert.alert("Google sign-in", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="relative flex-1 overflow-hidden bg-black">
      <StatusBar style="light" />
      <View pointerEvents="none" className="absolute inset-0">
        <OnboardingRadialBackdrop theme="violet" />
      </View>

      <SafeAreaView className="z-10 flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={() => navigation.goBack()} style={styles.backHit} accessibilityRole="button">
              <Text className="text-base text-violet-300">← Back</Text>
            </Pressable>

            <GlassPanel tint="dark" intensity={48} borderRadius={22} style={{ marginTop: 12 }} contentStyle={styles.glassAuthCard}>
            <Text className="text-3xl font-bold text-white">Create account</Text>
            <Text className="mt-2 text-base leading-6 text-slate-300">Set up your FinFlow account in a few seconds.</Text>

            <Text className="mb-2 mt-8 text-sm font-medium text-slate-400">Email</Text>
            <TextInput
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
            />

            <Text className="mb-2 mt-4 text-sm font-medium text-slate-400">Password</Text>
            <TextInput
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white"
              secureTextEntry
              placeholder="Min 6 characters"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
            />

            <Text className="mb-2 mt-4 text-sm font-medium text-slate-400">Confirm password</Text>
            <TextInput
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white"
              secureTextEntry
              placeholder="Repeat password"
              placeholderTextColor="#64748b"
              value={confirm}
              onChangeText={setConfirm}
            />

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onSubmit}
              className="mt-8 items-center justify-center rounded-full bg-violet-600 py-4 active:bg-violet-700 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[17px] font-semibold text-white">Register</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onGoogle}
              className="mt-4 flex-row items-center justify-center rounded-full border border-white/25 bg-white/10 py-4 active:bg-white/15 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View className="mr-3">
                    <GoogleLogo size={22} />
                  </View>
                  <Text className="text-[17px] font-semibold text-white">Continue with Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Login")}
              className="mt-8 items-center py-2"
            >
              <Text className="text-base text-slate-400">
                Already have an account? <Text className="font-semibold text-violet-300">Log in</Text>
              </Text>
            </Pressable>
            </GlassPanel>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  backHit: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 16,
  },
  glassAuthCard: {
    padding: 20,
  },
});
