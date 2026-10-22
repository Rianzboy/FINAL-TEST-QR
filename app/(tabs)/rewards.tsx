import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CampusBackground from '@/components/CampusBackground';
import { CAMPUS } from '@/constants/colors';
import PageHeader from '@/components/PageHeader';
import DataTable, { Column } from '@/components/DataTable';
import { useAuth } from '@/lib/auth';
import { getAttendanceHistory } from '@/lib/attendance';

type Milestone = {
  count: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const milestones: Milestone[] = [
  {
    count: 1,
    title: 'First Check-in',
    description: 'Your first recorded attendance.',
    icon: 'flag-outline',
  },
  {
    count: 5,
    title: 'Regular Attendee',
    description: 'Attend five events.',
    icon: 'ribbon-outline',
  },
  {
    count: 10,
    title: 'Campus Regular',
    description: 'Attend ten events.',
    icon: 'medal-outline',
  },
  {
    count: 25,
    title: 'Attendance Champion',
    description: 'Attend twenty-five events.',
    icon: 'trophy-outline',
  },
];

export default function RewardsScreen() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (user?.id) {
      const history = await getAttendanceHistory(user.id);
      setCount(history.length);
    } else setCount(0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const next = milestones.find((m) => count < m.count);
  const progress = next ? Math.min(100, (count / next.count) * 100) : 100;
  const unlockedCount = milestones.filter((m) => count >= m.count).length;

  const columns: Column<Milestone & { unlocked: boolean }>[] = [
    {
      key: 'title',
      label: 'Milestone',
      width: 240,
      searchable: true,
      render: (item) => (
        <View style={styles.milestoneCell}>
          <View
            style={[
              styles.milestoneIcon,
              item.unlocked && styles.milestoneIconUnlocked,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={item.unlocked ? CAMPUS.mint : CAMPUS.textFaint}
            />
          </View>
          <View style={{ minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.muted} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      width: 140,
      align: 'center',
      render: (item) => (
        <Text style={styles.meta}>
          {item.count} record{item.count === 1 ? '' : 's'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      align: 'center',
      render: (item) => (
        <View
          style={[styles.statusPill, item.unlocked && styles.statusPillUnlocked]}
        >
          <Ionicons
            name={item.unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
            size={12}
            color={item.unlocked ? CAMPUS.mint : CAMPUS.textMuted}
          />
          <Text
            style={[
              styles.statusText,
              { color: item.unlocked ? CAMPUS.mint : CAMPUS.textMuted },
            ]}
          >
            {item.unlocked ? 'UNLOCKED' : 'LOCKED'}
          </Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.root}>
      <CampusBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={CAMPUS.accent}
            colors={[CAMPUS.accent]}
            progressBackgroundColor={CAMPUS.bgDeep}
          />
        }
      >
        <PageHeader
          eyebrow="YOUR ATTENDANCE JOURNEY"
          title="Achievements & Rewards"
          subtitle="Milestones are calculated from your recorded attendance history."
          count={unlockedCount}
          countLabel={`of ${milestones.length} unlocked`}
          icon="trophy-outline"
        />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.trophyBox}>
              <Ionicons name="trophy" size={26} color={CAMPUS.accent} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroLabel}>TOTAL CHECK-INS</Text>
              <Text style={styles.big}>{loading ? '—' : count}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>
                {unlockedCount}/{milestones.length}
              </Text>
              <Text style={styles.heroBadgeLabel}>badges</Text>
            </View>
          </View>

          <View style={styles.heroProgress}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>
                {next ? `Next: ${next.title}` : 'All milestones unlocked'}
              </Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${progress}%` as any }]}
              />
            </View>
            <Text style={styles.progressText}>
              {next
                ? `${next.count - count} more attendance record${
                    next.count - count === 1 ? '' : 's'
                  } to unlock ${next.title}.`
                : 'All current milestones unlocked. Amazing work!'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={CAMPUS.accent} size="large" />
            <Text style={styles.loadingText}>Calculating achievements…</Text>
          </View>
        ) : (
          <DataTable
            data={milestones.map((m) => ({ ...m, unlocked: count >= m.count }))}
            columns={columns}
            rowId={(item) => item.title}
            title="Milestone tracker"
            subtitle="Check-ins required for each achievement."
            icon="ribbon-outline"
            searchable={false}
            pageSize={0}
            emptyTitle="No milestones"
            emptyMessage="No achievement milestones are configured yet."
            emptyIcon="trophy-outline"
            stripe
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAMPUS.bg },
  content: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.32)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flexWrap: 'wrap',
  },
  trophyBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.28)',
  },
  heroInfo: { flex: 1, minWidth: 90 },
  big: {
    fontSize: 34,
    color: CAMPUS.text,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 1,
  },
  heroLabel: {
    fontSize: 9,
    color: CAMPUS.accent,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroBadge: {
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  heroBadgeValue: {
    color: CAMPUS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  heroBadgeLabel: {
    color: CAMPUS.textFaint,
    fontFamily: CAMPUS.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  heroProgress: { marginTop: 16 },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  progressLabel: {
    color: CAMPUS.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressPercent: {
    color: CAMPUS.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  track: {
    height: 7,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: CAMPUS.mint,
    borderRadius: 999,
  },
  progressText: {
    color: CAMPUS.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 8,
  },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: CAMPUS.textMuted, fontSize: 13 },
  milestoneCell: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  milestoneIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  milestoneIconUnlocked: {
    backgroundColor: 'rgba(228,228,231,0.10)',
    borderColor: 'rgba(228,228,231,0.28)',
  },
  cardTitle: { color: CAMPUS.text, fontSize: 12.5, fontWeight: '800' },
  muted: { fontSize: 10.5, color: CAMPUS.textMuted, lineHeight: 15, marginTop: 1 },
  meta: { color: CAMPUS.textMuted, fontSize: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  statusPillUnlocked: {
    backgroundColor: 'rgba(228,228,231,0.10)',
    borderColor: 'rgba(228,228,231,0.28)',
  },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});
