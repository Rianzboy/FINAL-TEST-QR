import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CAMPUS } from '@/constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;
type DrawerItem = { label: string; route: string; icon: IconName; roles?: ('teacher' | 'admin')[] };
const ITEMS: DrawerItem[] = [
  { label: 'Home', route: '/(tabs)', icon: 'home-outline' },
  { label: 'Scan QR', route: '/(tabs)/scan', icon: 'qr-code-outline' },
  { label: 'Attendance History', route: '/(tabs)/history', icon: 'time-outline' },
  { label: 'Reminders', route: '/(tabs)/reminders', icon: 'notifications-outline' },
  { label: 'Profile', route: '/(tabs)/profile', icon: 'person-outline' },
  { label: 'Teacher', route: '/(tabs)/teacher', icon: 'school-outline', roles: ['teacher', 'admin'] },
  { label: 'Admin', route: '/(tabs)/admin', icon: 'shield-checkmark-outline', roles: ['admin'] },
];

export default function AppDrawer({ role }: { role: 'student' | 'teacher' | 'admin' | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  const columns = width >= 1050 ? 4 : width >= 650 ? 3 : 2;
  const sidePadding = width >= 1050 ? 32 : width >= 650 ? 24 : width >= 390 ? 18 : 16;
  const gridGap = width >= 650 ? 14 : width >= 390 ? 12 : 10;
  // Limit oversized desktop cards while centering the grid in the drawer.
  const contentWidth = Math.min(width - sidePadding * 2, 1100);
  const cardWidth = Math.max(0, (contentWidth - (columns - 1) * gridGap) / columns - 0.5);
  const isPhone = width < 650;
  const compactBar = width < 520;
  const sheetHeight = Math.min(height * (isPhone ? 0.9 : 0.84), isPhone ? 760 : 740);
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = translateY.interpolate({ inputRange: [0, sheetHeight], outputRange: [1, 0], extrapolate: 'clamp' });
  const openRef = useRef(false);
  const draggingFrom = useRef(0);
  const visibleItems = useMemo(() => ITEMS.filter(item => !item.roles || (!!role && item.roles.includes(role as 'teacher' | 'admin'))), [role]);


  const springTo = (value: number, done?: () => void) => {
    translateY.stopAnimation();
    Animated.spring(translateY, { toValue: value, useNativeDriver: true, damping: 28, stiffness: 260, mass: 0.85, overshootClamping: true }).start(({ finished }) => {
      if (finished && value !== 0) { openRef.current = false; setOpen(false); done?.(); }
    });
  };
  const show = () => {
    if (openRef.current) return;
    translateY.stopAnimation();
    translateY.setValue(sheetHeight);
    openRef.current = true;
    setOpen(true);
    requestAnimationFrame(() => springTo(0));
  };
  const hide = (done?: () => void) => springTo(sheetHeight, done);

  // The header is a dedicated gesture target so scrolling menu items remains unhindered.
  const sheetPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderGrant: () => { translateY.stopAnimation(v => { draggingFrom.current = v; }); },
    onPanResponderMove: (_e, g) => translateY.setValue(Math.max(0, Math.min(sheetHeightRef.current, draggingFrom.current + g.dy))),
    onPanResponderRelease: (_e, g) => { if (g.dy > sheetHeightRef.current * 0.24 || g.vy > 0.65) hide(); else springTo(0); },
    onPanResponderTerminate: () => springTo(0),
  })).current;
  // The sheet is dismissed by dragging its header downward.

  return <>
    <StatusBar style="light" />
    <View style={[styles.openerBar, { paddingTop: insets.top + 8 }]} pointerEvents={open ? 'none' : 'auto'}>
      <View style={styles.barInner}>
        <View style={styles.barBrand}>
          <View style={styles.barBrandIcon}><Ionicons name="scan" size={18} color={CAMPUS.accent} /></View>
          <View style={{ minWidth: 0 }}>
            <Text style={styles.barBrandName}>QR-ATTENDANCE</Text>
            {!compactBar && <Text style={styles.barBrandSub}>CCS ATTENDANCE</Text>}
          </View>
        </View>
        <Pressable onPress={show} accessibilityRole="button" accessibilityLabel="Open navigation menu" style={({ pressed }) => [styles.opener, pressed && { opacity: 0.85 }]}>
          <View style={styles.openerIcon}><Ionicons name="grid-outline" size={16} color="#FFFFFF" /></View>
          <View style={styles.openerCopy}>
            <Text style={styles.openerTitle}>{compactBar ? 'Menu' : 'Explore'}</Text>
            {!compactBar && <Text style={styles.openerCaption}>Open navigation menu</Text>}
          </View>
          <Ionicons name="chevron-down" size={17} color={CAMPUS.accent} />
        </Pressable>
      </View>
    </View>
    {open && <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
      <Pressable accessibilityLabel="Close navigation menu" accessibilityRole="button" onPress={() => hide()} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.sheet, { paddingHorizontal: sidePadding, height: sheetHeight, paddingBottom: Math.max(insets.bottom, 14) + 8, transform: [{ translateY }] }]}>
        <View style={[styles.dragRegion, { maxWidth: contentWidth, width: '100%', alignSelf: 'center' }]} {...sheetPan.panHandlers}>
          <View style={styles.grabber}/>
          <View style={styles.sheetHeading}>
            <View style={styles.sheetBrand}><Ionicons name="scan" size={23} color={CAMPUS.accent}/></View>
            <View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR WORKSPACE</Text><Text style={styles.sheetTitle}>Navigate your campus</Text></View>
            <Pressable onPress={() => hide()} accessibilityRole="button" accessibilityLabel="Close menu" style={styles.xButton}><Ionicons name="close" size={19} color={CAMPUS.textMuted}/></Pressable>
          </View>
          <Text style={styles.subheading}>Everything you need, one tap away.</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentWidth }} contentContainerStyle={[styles.grid, { gap: gridGap, paddingBottom: isPhone ? 26 : 18 }]} bounces={false} keyboardShouldPersistTaps="handled">
          {visibleItems.map(item => {
            const active = pathname === item.route || (item.route === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)'));
            return <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => hide(() => router.push(item.route as any))} style={({ pressed }) => [styles.item, { width: cardWidth, minHeight: isPhone ? 106 : 114, borderRadius: isPhone ? 20 : 24, padding: isPhone ? 13 : 15 }, active && styles.itemActive, pressed && styles.pressed]}>
              <View style={[styles.iconBox, active && styles.iconBoxActive]}><Ionicons name={item.icon} size={23} color={active ? CAMPUS.bgDeep : CAMPUS.accent} /></View>
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]} numberOfLines={2}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={active ? CAMPUS.accent : CAMPUS.textMuted} style={styles.cornerArrow}/>
            </Pressable>;
          })}
        </ScrollView>
        <View style={[styles.footer, { maxWidth: contentWidth, width: '100%', alignSelf: 'center' }]}><View style={styles.footerDot}/><Text style={styles.footerText}>QR-ATT  /  CAMPUS CONNECTED</Text><Ionicons name="shield-checkmark-outline" size={15} color={CAMPUS.mint}/></View>
      </Animated.View>
    </View>}
  </>;
}

const styles = StyleSheet.create({
  openerBar: { width: '100%', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8, backgroundColor: 'transparent', zIndex: 20 },
  barInner: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: 'rgba(20,21,25,0.94)', borderWidth: 1, borderColor: CAMPUS.border, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, elevation: 10 },
  barBrand: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  barBrandIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: CAMPUS.surfaceStrong, borderWidth: 1, borderColor: CAMPUS.border },
  barBrandName: { color: CAMPUS.text, fontSize: 14, fontWeight: '900', letterSpacing: 1.4 },
  barBrandSub: { color: CAMPUS.textFaint, fontSize: 7.5, letterSpacing: 1.5, fontWeight: '800', marginTop: 1 },
  opener: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: CAMPUS.surface, paddingVertical: 6, paddingLeft: 7, paddingRight: 12, borderWidth: 1, borderColor: CAMPUS.border, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  openerIcon: { backgroundColor: CAMPUS.primary, width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  openerCopy: { minWidth: 0 }, openerTitle: { color: CAMPUS.text, fontSize: 11.5, fontWeight: '800' }, openerCaption: { color: CAMPUS.textMuted, fontSize: 8.5, marginTop: 1 },
  overlay: { zIndex: 100, elevation: 30 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050506', opacity: 0.7 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: CAMPUS.bgDeep, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#2B2E35', overflow: 'hidden', paddingHorizontal: 20, paddingTop: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 25 },
  dragRegion: { paddingBottom: 18 }, grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 100, backgroundColor: '#71717A', marginBottom: 17 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', gap: 13 }, sheetBrand: { width: 49, height: 49, borderRadius: 16, backgroundColor: '#1E2025', borderWidth: 1, borderColor: '#30333A', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: CAMPUS.accent, fontWeight: '800', letterSpacing: 2, fontSize: 9 }, sheetTitle: { color: CAMPUS.text, fontWeight: '800', fontSize: 20, marginTop: 3, letterSpacing: -0.5 },
  xButton: { backgroundColor: CAMPUS.surfaceStrong, borderRadius: 18, width: 37, height: 37, alignItems: 'center', justifyContent: 'center' }, subheading: { color: CAMPUS.textMuted, fontSize: 13, marginTop: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start' },
  item: { minHeight: 114, backgroundColor: CAMPUS.surface, borderRadius: 24, borderWidth: 1, borderColor: CAMPUS.border, padding: 15, justifyContent: 'space-between', gap: 8 },
  itemActive: { backgroundColor: '#26282E', borderColor: '#4B5563' }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  iconBox: { backgroundColor: '#1E2025', width: 43, height: 43, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, iconBoxActive: { backgroundColor: CAMPUS.accent },
  itemLabel: { fontSize: 13, fontWeight: '700', color: CAMPUS.text, maxWidth: '90%' }, itemLabelActive: { color: '#E4E4E7' }, cornerArrow: { position: 'absolute', right: 15, top: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: CAMPUS.border }, footerDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: CAMPUS.mint }, footerText: { color: CAMPUS.textFaint, flex: 1, letterSpacing: 1, fontSize: 9, fontWeight: '800' },
});
