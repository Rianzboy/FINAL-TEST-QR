import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CAMPUS } from '@/constants/colors';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  backLabel?: string;
  onBack?: () => void;
  /** Optional element rendered on the right (buttons, filters, etc.). */
  right?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  count,
  countLabel,
  icon,
  iconColor = CAMPUS.accent,
  backLabel,
  onBack,
  right,
}: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? 'Go back'}
          hitSlop={6}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={CAMPUS.text} />
          <Text style={styles.backText}>{backLabel ?? 'Back'}</Text>
        </Pressable>
      ) : null}

      <View style={styles.content}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}

        <View style={styles.titleRow}>
          {icon ? (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: `${iconColor}1a`,
                  borderColor: `${iconColor}44`,
                },
              ]}
            >
              <Ionicons name={icon} size={19} color={iconColor} />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>

          {count !== undefined ? (
            <View style={styles.countPill}>
              <Text style={styles.countPillNumber}>{count}</Text>
              <Text style={styles.countPillLabel}>{countLabel ?? ''}</Text>
            </View>
          ) : null}

          {right ? <View style={styles.right}>{right}</View> : null}
        </View>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingLeft: 7,
    paddingRight: 11,
    borderRadius: 12,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  backText: {
    fontFamily: CAMPUS.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
  },
  content: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: CAMPUS.mono,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: CAMPUS.accent,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: CAMPUS.text,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12.5,
    color: CAMPUS.textMuted,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 620,
  },
  right: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  countPillNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: CAMPUS.text,
  },
  countPillLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 8.5,
    letterSpacing: 0.7,
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
  },
});
