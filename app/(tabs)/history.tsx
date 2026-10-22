import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function formatDateTime(iso: string | null) {
  if (!iso) return 'Not set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const shortId = (id: string) => (id ? `…${id.slice(-8)}` : 'unknown');

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!hasLoaded.current) setLoading(true);

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';

    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setRecords([]);
    } else {
      const rows = await getAttendanceHistory(user.id);
      setRecords(rows);
      setTeacherEvents([]);
    }

    hasLoaded.current = true;
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const refreshButton = (
    <Pressable
      onPress={handleRefresh}
      accessibilityRole="button"
      accessibilityLabel="Refresh attendance history"
      hitSlop={6}
      style={({ pressed }) => [
        styles.refreshButton,
        pressed && styles.refreshButtonPressed,
      ]}
    >
      <Ionicons name="refresh-outline" size={17} color={CAMPUS.accent} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <CampusBackground />
        <View style={styles.content}>
          <PageHeader
            eyebrow="ATTENDANCE LOG"
            title="Attendance History"
            icon="time-outline"
            right={refreshButton}
          />
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={CAMPUS.accent} />
            <Text style={styles.stateText}>Loading records…</Text>
          </View>
        </View>
      </View>
    );
  }

  /* -------------------- Teacher view: events table -------------------- */
  if (role === 'teacher') {
    const totalAttendees = teacherEvents.reduce(
      (sum, event) => sum + event.attendeeCount,
      0
    );
    const expanded = teacherEvents.find(
      (event) => event.eventId === expandedEvent
    );

    const eventColumns: Column<TeacherEventAttendance>[] = [
      {
        key: 'title',
        label: 'Event',
        width: 280,
        sortable: true,
        render: (item) => (
          <View style={styles.primaryCell}>
            <Text style={styles.primaryText} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.codeRow}>
              <Ionicons
                name="pricetag-outline"
                size={10}
                color={CAMPUS.textFaint}
              />
              <Text style={styles.codeText} numberOfLines={1}>
                {item.eventCode}
              </Text>
            </View>
          </View>
        ),
      },
      {
        key: 'startTime',
        label: 'Starts',
        width: 230,
        sortable: true,
        render: (item) => (
          <Text style={styles.secondaryText}>{formatDateTime(item.startTime)}</Text>
        ),
      },
      {
        key: 'attendeeCount',
        label: 'Attendees',
        width: 140,
        align: 'center',
        sortable: true,
        render: (item) => (
          <View style={styles.countPill}>
            <Ionicons name="people" size={12} color={CAMPUS.accent} />
            <Text style={styles.countPillText}>{item.attendeeCount}</Text>
          </View>
        ),
      },
    ];

    const attendeeColumns: Column<{
      studentId: string;
      scannedAt: string;
    }>[] = [
      {
        key: 'studentId',
        label: 'Student',
        width: 300,
        searchable: true,
        render: (item) => (
          <View style={styles.studentCell}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={12} color={CAMPUS.accent} />
            </View>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.primaryText} numberOfLines={1}>
                {shortId(item.studentId)}
              </Text>
              <Text style={styles.codeText}>Student ID</Text>
            </View>
          </View>
        ),
      },
      {
        key: 'scannedAt',
        label: 'Checked in at',
        width: 240,
        sortable: true,
        render: (item) => (
          <Text style={styles.secondaryText}>
            {formatDateTime(item.scannedAt)}
          </Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 130,
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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
          <PageHeader
            eyebrow="ATTENDANCE LOG"
            title="Attendance History"
            subtitle="Review every check-in across the events you created."
            count={teacherEvents.length}
            countLabel={teacherEvents.length === 1 ? 'event' : 'events'}
            icon="calendar-outline"
            right={refreshButton}
          />

          <View style={styles.statsRow}>
            <Stat
              icon="calendar-outline"
              label="Events"
              value={teacherEvents.length}
            />
            <Stat
              icon="people-outline"
              label="Total check-ins"
              value={totalAttendees}
            />
            <Stat
              icon="pulse-outline"
              label="Average per event"
              value={
                teacherEvents.length
                  ? Math.round(totalAttendees / teacherEvents.length)
                  : 0
              }
              suffix="check-ins"
            />
          </View>

          <DataTable
            data={teacherEvents}
            columns={eventColumns}
            rowId={(item) => item.eventId}
            title="Your events"
            subtitle="Tap a row to inspect its attendance list."
            icon="calendar-outline"
            searchPlaceholder="Search events or codes…"
            pageSize={8}
            emptyTitle="No events yet"
            emptyMessage="Create an event from the Teacher tab to begin tracking attendance."
            emptyIcon="calendar-outline"
            onRowPress={(item) => setExpandedEvent(item.eventId)}
            selectedIds={expanded ? new Set([expanded.eventId]) : undefined}
            stripe
          />

          {expanded ? (
            <View style={styles.expandedCard}>
              <View style={styles.detailHeader}>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailEyebrow}>ATTENDEE DETAIL</Text>
                  <Text style={styles.detailTitle} numberOfLines={2}>
                    {expanded.title}
                  </Text>
                  <Text style={styles.detailMeta}>
                    {expanded.eventCode} · Starts {formatDateTime(expanded.startTime)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setExpandedEvent(null)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.refreshButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close attendee details"
                >
                  <Ionicons name="close" size={17} color={CAMPUS.textMuted} />
                </Pressable>
              </View>

              <DataTable
                data={expanded.attendees}
                columns={attendeeColumns}
                rowId={(item) => `${item.studentId}-${item.scannedAt}`}
                title="Attendance list"
                subtitle={`${expanded.attendeeCount} student${
                  expanded.attendeeCount === 1 ? '' : 's'
                } checked in`}
                icon="people-outline"
                searchPlaceholder="Search student IDs…"
                pageSize={10}
                emptyTitle="No attendees yet"
                emptyMessage="No students have scanned this QR code yet."
                emptyIcon="scan-outline"
                dense
                stripe
              />
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  /* -------------------- Student view: records table -------------------- */
  const uniqueEvents = new Set(records.map((record) => record.eventTitle)).size;

  const recordColumns: Column<AttendanceRecord>[] = [
    {
      key: 'eventTitle',
      label: 'Event',
      width: 300,
      sortable: true,
      render: (item) => (
        <View style={styles.primaryCell}>
          <Text style={styles.primaryText} numberOfLines={1}>
            {item.eventTitle || 'Untitled event'}
          </Text>
          <Text style={styles.codeText} numberOfLines={1}>
            {item.eventId ? `Code ${item.eventId}` : 'No event code'}
          </Text>
        </View>
      ),
    },
    {
      key: 'scannedAt',
      label: 'Checked in at',
      width: 240,
      sortable: true,
      render: (item) => (
        <Text style={styles.secondaryText}>
          {formatDateTime(item.scannedAt)}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
        <PageHeader
          eyebrow="ATTENDANCE LOG"
          title="Attendance History"
          subtitle="Every event you have checked into, newest first."
          count={records.length}
          countLabel={records.length === 1 ? 'check-in' : 'check-ins'}
          icon="qr-code-outline"
          right={refreshButton}
        />

        <View style={styles.statsRow}>
          <Stat icon="checkmark-done-outline" label="Check-ins" value={records.length} />
          <Stat icon="albums-outline" label="Events attended" value={uniqueEvents} />
          <Stat
            icon="calendar-outline"
            label="Latest check-in"
            value={
              records.length
                ? new Date(records[0].scannedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
            }
            suffix={
              records.length
                ? new Date(records[0].scannedAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'No check-ins yet'
            }
          />
        </View>

        <DataTable
          data={records}
          columns={recordColumns}
          rowId={(item) => item.id}
          title="Your check-ins"
          subtitle="Attendance recorded against your student account."
          icon="qr-code-outline"
          searchPlaceholder="Search events or dates…"
          pageSize={12}
          initialSort={{ key: 'scannedAt', dir: 'desc' }}
          emptyTitle="No records yet"
          emptyMessage="Scan a QR code to register your attendance."
          emptyIcon="qr-code-outline"
          stripe
        />
      </ScrollView>
    </View>
  );
}

/* ------------------------- Look-only pieces ------------------------- */

function Stat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={15} color={CAMPUS.accent} />
      </View>
      <View style={{ minWidth: 0 }}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {suffix ? (
          <Text style={styles.statSuffix} numberOfLines={1}>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  content: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stateBox: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 12,
  },
  stateText: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    marginTop: 14,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  refreshButtonPressed: { opacity: 0.65 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 16,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.24)',
  },
  statValue: {
    color: CAMPUS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  statSuffix: {
    color: CAMPUS.textFaint,
    fontSize: 10,
    marginTop: 2,
  },
  primaryCell: { minWidth: 0, gap: 3 },
  primaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CAMPUS.text,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeText: {
    fontFamily: CAMPUS.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: CAMPUS.textFaint,
  },
  secondaryText: {
    fontSize: 12,
    color: CAMPUS.textMuted,
    lineHeight: 17,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.26)',
  },
  countPillText: {
    color: CAMPUS.accent,
    fontSize: 11.5,
    fontWeight: '900',
  },
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
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  studentCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.24)',
  },
  expandedCard: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: CAMPUS.border,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  detailCopy: { flex: 1, minWidth: 0 },
  detailEyebrow: {
    fontFamily: CAMPUS.mono,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#D4D4D8',
  },
  detailTitle: {
    color: CAMPUS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 5,
  },
  detailMeta: {
    color: CAMPUS.textMuted,
    fontSize: 11.5,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
});
