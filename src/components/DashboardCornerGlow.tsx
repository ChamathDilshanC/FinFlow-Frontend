import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** Matches web: radial blue (#bfdbfe) corners on white — ~600px circles at top left / top right */
const GLOW = "#bfdbfe";
const R = 600;
const CY = 200;
const ID_L = "dashCornerGlowL";
const ID_R = "dashCornerGlowR";

export function DashboardCornerGlow() {
  const { width: w, height: h } = useWindowDimensions();

  return (
    <Svg width={w} height={h} style={styles.svg} pointerEvents="none">
      <Defs>
        <RadialGradient
          id={ID_L}
          cx={0}
          cy={CY}
          rx={R}
          ry={R}
          fx={0}
          fy={CY}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={GLOW} stopOpacity={0.95} />
          <Stop offset="0.42" stopColor={GLOW} stopOpacity={0.22} />
          <Stop offset="0.72" stopColor={GLOW} stopOpacity={0.04} />
          <Stop offset="1" stopColor={GLOW} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id={ID_R}
          cx={w}
          cy={CY}
          rx={R}
          ry={R}
          fx={w}
          fy={CY}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={GLOW} stopOpacity={0.95} />
          <Stop offset="0.42" stopColor={GLOW} stopOpacity={0.22} />
          <Stop offset="0.72" stopColor={GLOW} stopOpacity={0.04} />
          <Stop offset="1" stopColor={GLOW} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${ID_L})`} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${ID_R})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
