import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassPanel } from "../components/GlassPanel";
import { OnboardingRadialBackdrop } from "../components/OnboardingRadialBackdrop";
import type { RootStackParamList } from "../navigation/types";

const LOGO = require("../../assets/application/logo.png");

type ThemeKey = "violet" | "rose" | "blue";

const ACCENT = {
  violet: {
    dot: "mr-2 h-1 w-8 rounded-full bg-violet-400",
    button: "mt-10 w-full items-center justify-center rounded-full bg-violet-600 py-4 active:bg-violet-700",
    login: "text-base font-semibold text-violet-300",
  },
  rose: {
    dot: "mr-2 h-1 w-8 rounded-full bg-rose-400",
    button: "mt-10 w-full items-center justify-center rounded-full bg-rose-600 py-4 active:bg-rose-700",
    login: "text-base font-semibold text-rose-300",
  },
  blue: {
    dot: "mr-2 h-1 w-8 rounded-full bg-[#008BFF]",
    button:
      "mt-10 w-full items-center justify-center rounded-full bg-[#008BFF] py-4 active:bg-[#0078E6]",
    login: "text-base font-semibold text-[#5CB3FF]",
  },
} as const;

type Slide = {
  theme: ThemeKey;
  headline: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    theme: "violet",
    headline: "Subscriptions",
    body: "Track renewals, billing cycles, monthly equivalents, and soft limits — all synced with your FinFlow backend.",
  },
  {
    theme: "rose",
    headline: "Spending you control",
    body: "Log expenses by category, filter by date, and keep transactions aligned with budgets and your default currency.",
  },
  {
    theme: "blue",
    headline: "Dashboard & peace",
    body: "See totals, remaining budget, category splits, payment history, and notification preferences in one calm view.",
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goToAuth = () => navigation.navigate("Login");

  const goNext = () => {
    if (isLast) {
      goToAuth();
    } else {
      setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    }
  };

  return (
    <View className="relative w-full flex-1 overflow-hidden bg-black">
      <StatusBar style="light" />

      <View pointerEvents="none" className="absolute inset-0 z-0">
        <OnboardingRadialBackdrop key={`${slide.theme}-${index}`} theme={slide.theme} />
      </View>

      <SafeAreaView className="z-10 flex-1 px-8" edges={["top", "bottom"]}>
        <View className="flex-1 justify-end pb-5">
          <GlassPanel
            tint="dark"
            intensity={42}
            borderRadius={28}
            style={{ width: "100%" }}
            contentStyle={styles.welcomeGlass}
          >
          <View className="w-full items-start">
            <View className="mb-10 flex-row items-center">
              <Image
                source={LOGO}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text className="ml-3 text-[26px] font-semibold tracking-tight text-white">FinFlow</Text>
            </View>

            <Text className="text-left text-[30px] font-bold leading-[38px] tracking-tight text-white">
              {slide.headline}
            </Text>
            <Text className="mt-4 text-left text-base leading-6 text-slate-200">{slide.body}</Text>

            <View className="mt-8 flex-row items-center self-start">
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  className={
                    i === index ? ACCENT[SLIDES[i].theme].dot : "mr-2 h-1 w-6 rounded-full bg-slate-600"
                  }
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? "Get started" : "Next slide"}
              onPress={goNext}
              className={ACCENT[slide.theme].button}
            >
              <Text className="text-center text-[17px] font-semibold text-white">
                {isLast ? "Get started" : "Next"}
              </Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={goToAuth} className="mt-5 w-full flex-row flex-wrap items-center justify-center py-2">
              <Text className="text-base text-slate-400">Already have an account? </Text>
              <Text className={ACCENT[slide.theme].login}>
                Log in
              </Text>
            </Pressable>
          </View>
          </GlassPanel>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 48,
    height: 48,
  },
  welcomeGlass: {
    paddingHorizontal: 4,
    paddingVertical: 22,
    paddingBottom: 12,
  },
});
