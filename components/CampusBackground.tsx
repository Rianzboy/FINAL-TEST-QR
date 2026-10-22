import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Path,
  Pattern,
  RadialGradient,
  Circle,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { CAMPUS } from '@/constants/colors';

// Faint graphite grid + neutral corner glows. Sits behind a screen's content.
export default function CampusBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
      <Defs>
        <Pattern
          id="bgGrid"
          width="44"
          height="44"
          patternUnits="userSpaceOnUse"
        >
          <Path
            d="M44 0H0V44"
            fill="none"
            stroke="rgba(255,255,255,0.060)"
            strokeWidth="1"
          />
        </Pattern>
        <RadialGradient id="bgGlowA" cx="90%" cy="0%" r="75%">
          <Stop offset="0" stopColor={CAMPUS.primary} stopOpacity="0.36" />
          <Stop offset="1" stopColor={CAMPUS.primary} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bgGlowB" cx="0%" cy="100%" r="75%">
          <Stop offset="0" stopColor={CAMPUS.accent} stopOpacity="0.18" />
          <Stop offset="1" stopColor={CAMPUS.accent} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="auroraThird" cx="5%" cy="20%" r="58%">
          <Stop offset="0" stopColor="#A1A1AA" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#A1A1AA" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bgGlowA)" />
      <Rect width="100%" height="100%" fill="url(#bgGlowB)" />
      <Rect width="100%" height="100%" fill="url(#auroraThird)" />
      <Rect width="100%" height="100%" fill="url(#bgGrid)" />
      </Svg>
    </View>
  );
}