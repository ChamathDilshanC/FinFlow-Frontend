import { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

export type RadialTheme = "violet" | "rose";

/** Top-centered radial glow on #000 — tall ellipse so tint reaches further down the screen */
const THEME = {
  violet: { center: "#8b5cf6", opacity: 0.28 },
  rose: { center: "#fb7185", opacity: 0.28 },
} as const;

type Props = {
  theme: RadialTheme;
};

export function OnboardingRadialBackdrop({ theme }: Props) {
  const { width: w, height: h } = useWindowDimensions();
  const { center, opacity } = THEME[theme];

  const { gradId, cx, cy, rx, ry } = useMemo(() => {
    const ellipseRx = w * 0.98;
    const ellipseRy = h * 0.82;
    return {
      gradId: `onboardingRadial_${theme}`,
      cx: w * 0.5,
      cy: -h * 0.06,
      rx: ellipseRx,
      ry: ellipseRy,
    };
  }, [w, h, theme]);

  return (
    <Svg width={w} height={h} style={styles.svg} pointerEvents="none">
      <Defs>
        <RadialGradient
          id={gradId}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fx={cx}
          fy={cy}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={center} stopOpacity={opacity} />
          <Stop offset="0.42" stopColor={center} stopOpacity={opacity * 0.52} />
          <Stop offset="0.68" stopColor={center} stopOpacity={opacity * 0.22} />
          <Stop offset="0.86" stopColor={center} stopOpacity={opacity * 0.06} />
          <Stop offset="0.97" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="#000000" />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gradId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
