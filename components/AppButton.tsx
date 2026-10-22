import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CAMPUS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

// Designed to read well on both light and dark screens:
//  - primary: glowing blue -> cyan gradient
//  - default: solid deep-navy button with a light border
export default function AppButton({
  title,
  icon,
  theme,
  onPress,
  disabled = false,
}: Props) {
  if (theme === 'primary') {
    return (
      <View style={styles.buttonOuter}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryInner,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled }}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="appButtonGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={CAMPUS.primary} />
                <Stop offset="1" stopColor={CAMPUS.accent} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#appButtonGrad)" />
            </Svg>
          </View>

          <Ionicons
            name={icon}
            size={22}
            color="#FFFFFF"
            style={styles.icon}
          />
          <Text style={[styles.label, styles.primaryLabel]}>{title}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonInner,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name={icon}
          size={22}
          color={CAMPUS.accent}
          style={styles.icon}
        />
        <Text style={styles.label}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 14,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  primaryInner: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonInner: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#1C1E23',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  icon: { paddingRight: 10 },
  label: { fontSize: 17, fontWeight: '600', color: CAMPUS.text },
  primaryLabel: { color: '#FFFFFF', fontWeight: '700' },
});