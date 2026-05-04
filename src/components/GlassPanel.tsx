import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Tint = "light" | "dark" | "default";

export type GlassCorners = {
  tl?: number;
  tr?: number;
  bl?: number;
  br?: number;
};

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: Tint;
  borderRadius?: number;
  /** Per-corner radius (overrides uniform ``borderRadius`` when set). */
  corners?: GlassCorners;
  /** Extra color wash on top of blur (e.g. brand purple for hero cards). */
  tintMultiply?: string;
};

export function GlassPanel({
  children,
  style,
  contentStyle,
  intensity = 50,
  tint = "light",
  borderRadius = 18,
  corners,
  tintMultiply,
}: Props) {
  const overlay =
    tint === "dark"
      ? "rgba(15,23,42,0.42)"
      : tint === "default"
        ? "rgba(248,250,252,0.38)"
        : "rgba(255,255,255,0.52)";

  const radiusStyle: ViewStyle = corners
    ? {
        borderTopLeftRadius: corners.tl ?? 0,
        borderTopRightRadius: corners.tr ?? 0,
        borderBottomLeftRadius: corners.bl ?? 0,
        borderBottomRightRadius: corners.br ?? 0,
      }
    : { borderRadius };

  const fillClip = [StyleSheet.absoluteFill, radiusStyle];

  return (
    <View
      style={[
        {
          ...radiusStyle,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tint === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.55)",
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint={tint} style={fillClip} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, radiusStyle, { backgroundColor: overlay }]} />
      {tintMultiply ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, radiusStyle, { backgroundColor: tintMultiply }]} />
      ) : null}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
