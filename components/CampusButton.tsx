import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CAMPUS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /**
   * 'primary'   = glowing blue gradient button
   * 'secondary' = glass row with chevron
   * 'danger'    = red-tinted glass row (sign out, delete...)
   */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export default function CampusButton({
  title,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
}: Props) {
  if (variant === 'primary') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.primary,
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
            <LinearGradient id="campusButtonGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={CAMPUS.primary} />
              <Stop offset="1" stopColor={CAMPUS.primaryDeep} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#campusButtonGrad)" />
          </Svg>
        </View>

        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <Text style={styles.primaryText}>{title}</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </Pressable>
    );
  }

  const isDanger = variant === 'danger';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondary,
        isDanger && styles.secondaryDanger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.iconTile, isDanger && styles.iconTileDanger]}>
        <Ionicons
          name={icon}
          size={21}
          color={isDanger ? CAMPUS.danger : CAMPUS.accent}
        />
      </View>
      <Text style={[styles.secondaryText, isDanger && styles.dangerText]}>
        {title}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDanger ? CAMPUS.danger : CAMPUS.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 19,
    paddingVertical: 19,
    overflow: 'hidden',
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.285,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 19,
    paddingVertical: 15,
    paddingHorizontal: 14,
  },
  secondaryDanger: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 19,
    backgroundColor: 'rgba(212,212,216,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileDanger: {
    backgroundColor: 'rgba(248,113,113,0.14)',
    borderColor: CAMPUS.dangerBorder,
  },
  secondaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: CAMPUS.text,
  },
  dangerText: {
    color: CAMPUS.danger,
  },
});