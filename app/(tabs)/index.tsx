import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CampusBackground from '@/components/CampusBackground';
import DataTable, { Column } from '@/components/DataTable';
import { CAMPUS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getAttendanceHistory, type AttendanceRecord } from '@/lib/attendance';
import { getProfile } from '@/lib/profiles';

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK_ACTIONS: {
  label: string;
  caption: string;
  icon: IconName;
  route: string;
}[] = [
  {
    label: 'Scan QR',
    caption: 'Check in to an event',
    icon: 'qr-code-outline',
    route: '/scan',
  },
  {
    label: 'History',
    caption: 'Review your check-ins',
    icon: 'time-outline',
    route: '/(tabs)/history',
  },
  {
    label: 'Reminders',
    caption: 'Upcoming campus events',
    icon: 'notifications-outline',
    route: '/(tabs)/reminders',
  },
  {
    label: 'Rewards',
    caption: 'Milestones unlocked',
    icon: 'trophy-outline',
    route: '/(tabs)/rewards',
  },
];

const MILESTONES = [1, 5, 10, 25];

export default function Index() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWideDashboard = width >= 980;
  const showHeroArt = width >= 1180;
  const [name, setName] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const [profile, history] = await Promise.all([
      getProfile(user.id),
      getAttendanceHistory(user.id),
    ]);
    setName(profile?.full_name?.trim().split(/\s+/)[0] ?? '');
    setRecords(history);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).getTime();
  const monthCount = records.filter(
    (record) => new Date(record.scannedAt).getTime() >= monthStart
  ).length;
  const eventsAttended = new Set(records.map((record) => record.eventTitle)).size;
  const unlocked = MILESTONES.filter((count) => records.length >= count).length;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'eventTitle',
      label: 'Event',
      width: 300,
      render: (item) => (
        <View style={styles.primaryCell}>
          <Text style={styles.primaryText} numberOfLines={1}>
            {item.eventTitle || 'Untitled event'}
          </Text>
          <Text style={styles.cellMeta} numberOfLines={1}>
            {item.eventId ? `Code ${item.eventId}` : 'No event code'}
          </Text>
        </View>
      ),
    },
    {
      key: 'scannedAt',
      label: 'Checked in',
      width: 200,
      render: (item) => (
        <Text style={styles.meta}>
          {new Date(item.scannedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      align: 'center',
      render: () => (
        <View style={styles.presentBadge}>
          <Ionicons name="checkmark-circle" size={12} color={CAMPUS.mint} />
          <Text style={styles.presentText}>Present</Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <CampusBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: 14 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={CAMPUS.accent}
            colors={[CAMPUS.accent]}
            progressBackgroundColor={CAMPUS.bgDeep}
          />
        }
      >
        {/* Page heading */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.pageEyebrow}>DASHBOARD</Text>
            <Text style={styles.pageTitle}>Home</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Ionicons name="person-outline" size={17} color={CAMPUS.accent} />
          </Pressable>
        </View>

        {/* Dashboard */}
        <View
          style={[
            styles.dashboardSplit,
            isWideDashboard && styles.dashboardSplitWide,
          ]}
        >
          <View
            style={[
              styles.dashboardMain,
              isWideDashboard && styles.dashboardMainWide,
            ]}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroGlow} />
              {showHeroArt ? (
                <View style={styles.heroArt} pointerEvents="none">
                  <View style={[styles.heroArtCorner, styles.heroArtTL]} />
                  <View style={[styles.heroArtCorner, styles.heroArtTR]} />
                  <View style={[styles.heroArtCorner, styles.heroArtBL]} />
                  <View style={[styles.heroArtCorner, styles.heroArtBR]} />
                  <Ionicons
                    name="qr-code-outline"
                    size={66}
                    color="rgba(212,212,216,0.22)"
                  />
                  <Text style={styles.heroArtLabel}>SCAN TO CHECK IN</Text>
                </View>
              ) : null}
              <View style={styles.heroBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.heroBadgeText}>SYSTEM ONLINE</Text>
              </View>
              <Text style={styles.heroEyebrow}>
                {name ? `WELCOME BACK, ${name.toUpperCase()}` : 'WELCOME BACK'}
              </Text>
              <Text style={styles.heroTitle}>
                Scan, track,{'\n'}and go.
              </Text>
              <Text style={styles.heroSubtitle}>
                Scan your code, track your event history, and go about your day — seamless check-ins made easy..
              </Text>

              <View style={styles.heroActions}>
                <Pressable
                  onPress={() => router.push('/scan')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={18}
                    color={CAMPUS.bgDeep}
                  />
                  <Text style={styles.primaryButtonText}>Scan QR code</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(tabs)/history')}
                  style={({ pressed }) => [
                    styles.ghostButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="time-outline" size={17} color={CAMPUS.text} />
                  <Text style={styles.ghostButtonText}>View history</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Quick access panel */}
          <View
            style={[styles.sidePanel, isWideDashboard && styles.sidePanelWide]}
          >
            <View style={styles.sideHeader}>
              <Text style={styles.sectionEyebrow}>QUICK ACCESS</Text>
              <Text style={styles.sideTitle}>Jump back in</Text>
            </View>
            <View style={styles.sideActions}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  style={({ pressed }) => [
                    styles.sideAction,
                    pressed && styles.sideActionPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={styles.sideActionIcon}>
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={CAMPUS.accent}
                    />
                  </View>
                  <View style={styles.sideActionCopy}>
                    <Text style={styles.sideActionLabel}>{action.label}</Text>
                    <Text style={styles.sideActionCaption} numberOfLines={1}>
                      {action.caption}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={CAMPUS.textFaint}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat
            icon="checkmark-done-outline"
            label="Total check-ins"
            value={loading ? '—' : records.length}
          />
          <Stat
            icon="albums-outline"
            label="Events attended"
            value={loading ? '—' : eventsAttended}
          />
          <Stat
            icon="calendar-outline"
            label="This month"
            value={loading ? '—' : monthCount}
          />
          <Stat
            icon="trophy-outline"
            label="Badges unlocked"
            value={loading ? '—' : unlocked}
          />
        </View>

        {/* Recent activity */}
        <View style={[styles.sectionHeader, { marginTop: 26 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.sectionEyebrow}>RECENT ACTIVITY</Text>
            <Text style={styles.sectionTitle}>Your latest check-ins</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/history')}
            style={({ pressed }) => [
              styles.viewAll,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons
              name="arrow-forward"
              size={13}
              color={CAMPUS.accent}
            />
          </Pressable>
        </View>

        <DataTable
          data={records.slice(0, 5)}
          columns={columns}
          rowId={(item) => item.id}
          loading={loading}
          title="Recent check-ins"
          subtitle="Your five most recent attendance records."
          icon="time-outline"
          searchable={false}
          pageSize={0}
          emptyTitle="No check-ins yet"
          emptyMessage="Scan an event QR code to record your first attendance."
          emptyIcon="qr-code-outline"
          onRowPress={() => router.push('/(tabs)/history')}
          stripe
        />

        {/* Footer cards */}
        <View
          style={[
            styles.footerRow,
            isWideDashboard && styles.footerRowWide,
          ]}
        >
          {/* Tip */}
          <View style={[styles.tip, isWideDashboard && styles.tipWide]}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={19} color={CAMPUS.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tipTitle}>QUICK TIP</Text>
              <Text style={styles.tipText}>
                Tap Explore in the top bar to open the navigation drawer and
                reach every campus tool.
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={CAMPUS.accent} />
          </View>

          {/* Developer */}
          <View
            style={[
              styles.developerCard,
              isWideDashboard && styles.developerWide,
            ]}
          >
            <View style={styles.developerIcon}>
              <Ionicons name="code-slash" size={19} color={CAMPUS.accent} />
            </View>
            <View style={styles.developerInfo}>
              <Text style={styles.developerLabel}>CRAFTED WITH PASSION BY</Text>
              <Text style={styles.developerName}>John Rian M. Cabase</Text>
              <Text style={styles.developerRole}>
                Developer • QR Attendance System
              </Text>
            </View>
            <View style={styles.developerBadge}>
              <Ionicons name="sparkles" size={15} color={CAMPUS.mint} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  tint = CAMPUS.accent,
}: {
  icon: IconName;
  label: string;
  value: number | string;
  tint?: string;
}) {
  return (
    <View style={styles.stat}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: `${tint}1a`, borderColor: `${tint}3d` },
        ]}
      >
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CAMPUS.bg },
  content: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  pressed: { opacity: 0.8 },

  /* Brand bar */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageEyebrow: {
    color: CAMPUS.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.9,
  },
  pageTitle: {
    color: CAMPUS.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },

  /* Dashboard layout */
  dashboardSplit: {
    gap: 16,
    marginBottom: 16,
  },
  dashboardSplitWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dashboardMain: { minWidth: 0 },
  dashboardMainWide: { flex: 1.55 },
  sidePanel: {
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 22,
    padding: 16,
  },
  sidePanelWide: { flex: 1 },
  sideHeader: { marginBottom: 12 },
  sideTitle: {
    color: CAMPUS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  sideActions: { gap: 7 },
  sideAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sideActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  sideActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAMPUS.surfaceStrong,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  sideActionCopy: { flex: 1, minWidth: 0 },
  sideActionLabel: {
    color: CAMPUS.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  sideActionCaption: {
    color: CAMPUS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },

  /* Hero */
  hero: {
    borderRadius: 26,
    backgroundColor: '#181A1F',
    borderWidth: 1,
    borderColor: '#2E3138',
    padding: 22,
    overflow: 'hidden',
    marginBottom: 0,
  },
  heroGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#26282E',
    top: -120,
    right: -90,
    opacity: 0.6,
  },
  heroArt: {
    position: 'absolute',
    right: 30,
    top: 40,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(212,212,216,0.38)',
  },
  heroArtTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 9,
  },
  heroArtTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 9,
  },
  heroArtBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 9,
  },
  heroArtBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 9,
  },
  heroArtLabel: {
    position: 'absolute',
    bottom: -22,
    color: 'rgba(212,212,216,0.55)',
    fontSize: 7.5,
    letterSpacing: 1.4,
    fontWeight: '900',
  },
  heroBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(228,228,231,0.10)',
    borderColor: 'rgba(228,228,231,0.30)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: CAMPUS.mint,
  },
  heroBadgeText: {
    color: CAMPUS.mint,
    fontWeight: '900',
    fontSize: 8.5,
    letterSpacing: 1,
  },
  heroEyebrow: {
    color: '#D4D4D8',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  heroTitle: {
    color: CAMPUS.text,
    fontWeight: '900',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  heroSubtitle: {
    color: CAMPUS.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 11,
    maxWidth: 380,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: CAMPUS.accent,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: CAMPUS.bgDeep,
    fontWeight: '900',
    fontSize: 12.5,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  ghostButtonText: {
    color: CAMPUS.text,
    fontWeight: '800',
    fontSize: 12.5,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 128,
    backgroundColor: CAMPUS.surface,
    borderColor: CAMPUS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statValue: {
    color: CAMPUS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 9,
  },
  statLabel: {
    color: CAMPUS.textMuted,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  /* Sections */
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    fontSize: 9,
    letterSpacing: 1.6,
    color: CAMPUS.accent,
    fontWeight: '900',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: CAMPUS.text,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.26)',
  },
  viewAllText: {
    color: CAMPUS.accent,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Recent table */
  primaryCell: { minWidth: 0, gap: 2 },
  primaryText: { color: CAMPUS.text, fontSize: 12.5, fontWeight: '700' },
  cellMeta: {
    color: CAMPUS.textFaint,
    fontFamily: CAMPUS.mono,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  meta: { color: CAMPUS.textMuted, fontSize: 12 },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(228,228,231,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(228,228,231,0.28)',
  },
  presentText: {
    color: CAMPUS.mint,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  /* Tip + developer */
  footerRow: {
    marginTop: 20,
    gap: 12,
  },
  footerRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    backgroundColor: '#191B20',
    borderWidth: 1,
    borderColor: '#2B2E35',
    borderRadius: 18,
    padding: 14,
  },
  tipWide: { flex: 1.35 },
  tipIcon: {
    height: 38,
    width: 38,
    backgroundColor: '#1E2025',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    color: CAMPUS.accent,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tipText: {
    color: CAMPUS.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },
  developerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 18,
    padding: 15,
    gap: 12,
  },
  developerWide: { flex: 1 },
  developerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1B1D22',
    borderWidth: 1,
    borderColor: '#2E3138',
    alignItems: 'center',
    justifyContent: 'center',
  },
  developerInfo: { flex: 1, minWidth: 0 },
  developerLabel: {
    color: CAMPUS.accent,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  developerName: {
    color: CAMPUS.text,
    fontSize: 13,
    fontWeight: '900',
  },
  developerRole: {
    color: CAMPUS.textMuted,
    fontSize: 9.5,
    marginTop: 3,
  },
  developerBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(228,228,231,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
