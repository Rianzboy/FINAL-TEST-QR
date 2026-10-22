import { Platform } from 'react-native';

// Light palette kept for compatibility with the original screens.
export const COLORS = {
  primary: '#52525B',
  background: '#F4F4F5',
  card: '#FFFFFF',
  textPrimary: '#18181B',
  textSecondary: '#52525B',
  textOnPrimary: '#FFFFFF',
  surface: '#E4E4E7',
  border: '#D4D4D8',
  shadow: '#18181B',
  warning: '#71717A',
  success: '#52525B',
  danger: '#DC2626',
} as const;

// "Graphite" design system — neutral charcoal surfaces, white/gray accents.
// Color is reserved for status and destructive actions.
export const CAMPUS = {
  bg: '#0C0D10',
  bgDeep: '#141519',
  surface: 'rgba(255,255,255,0.055)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  inputBg: 'rgba(255,255,255,0.045)',
  border: 'rgba(255,255,255,0.115)',
  panel: '#181A1F',
  panelBorder: '#2A2D34',
  primary: '#4B5563',
  primaryDeep: '#30343B',
  accent: '#D4D4D8',
  mint: '#E4E4E7',
  warning: '#E4E4E7',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textFaint: '#71717A',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.12)',
  dangerBorder: 'rgba(248,113,113,0.38)',
  mono: Platform.select({
    ios: 'Menlo', android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) as string,
} as const;
