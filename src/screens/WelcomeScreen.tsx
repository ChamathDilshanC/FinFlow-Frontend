import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { OnboardingRadialBackdrop } from "../components/OnboardingRadialBackdrop";

const LOGO = require("../../assets/application/logo.png");

type ThemeKey = "violet" | "rose";

type Slide = {
  theme: ThemeKey;
  headline: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    theme: "violet",
    headline: "Subscriptions at a glance",
    body: "Track renewals, billing cycles, monthly equivalents, and soft limits — all synced with your FinFlow backend.",
  },
  {
    theme: "rose",
    headline: "Spending you control",
    body: "Log expenses by category, filter by date, and keep transactions aligned with budgets and your default currency.",
  },
  {
    theme: "violet",
    headline: "Dashboard & peace",
    body: "See totals, remaining budget, category splits, payment history, and notification preferences in one calm view.",
  },
];

type WelcomeScreenProps = {
  onContinue: () => void;
  onLogin?: () => void;
};

export function WelcomeScreen({ onContinue, onLogin }: WelcomeScreenProps) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      onContinue();
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
                    i === index
                      ? slide.theme === "rose"
                        ? "mr-2 h-1 w-8 rounded-full bg-rose-400"
                        : "mr-2 h-1 w-8 rounded-full bg-violet-400"
                      : "mr-2 h-1 w-6 rounded-full bg-slate-600"
                  }
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? "Get started" : "Next slide"}
              onPress={goNext}
              className={
                slide.theme === "rose"
                  ? "mt-10 w-full items-center justify-center rounded-full bg-rose-600 py-4 active:bg-rose-700"
                  : "mt-10 w-full items-center justify-center rounded-full bg-violet-600 py-4 active:bg-violet-700"
              }
            >
              <Text className="text-center text-[17px] font-semibold text-white">
                {isLast ? "Get started" : "Next"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => onLogin?.()}
              className="mt-5 w-full flex-row flex-wrap items-center justify-center py-2"
            >
              <Text className="text-base text-slate-400">Already have an account? </Text>
              <Text
                className={
                  slide.theme === "rose"
                    ? "text-base font-semibold text-rose-300"
                    : "text-base font-semibold text-violet-300"
                }
              >
                Log in
              </Text>
            </Pressable>
          </View>
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
});
