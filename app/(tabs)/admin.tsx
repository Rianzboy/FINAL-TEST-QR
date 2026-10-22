import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import EventManager from '@/components/EventManager';
import { CAMPUS } from '@/constants/colors';
import PageHeader from '@/components/PageHeader';
import DataTable, { Column } from '@/components/DataTable';

/* ----------------------------- Types ----------------------------- */

type FeatureAction = 'users' | 'events' | 'attendance' | 'corrections' | 'reports';
type RoleName = 'student' | 'teacher' | 'admin';

type Feature = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: FeatureAction;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at?: string;
};

type EventRecord = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at?: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
};

type Notice = { type: 'success' | 'error'; text: string } | null;

type ModalState =
  | null
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      onConfirm: () => void;
    }
  | { kind: 'addAttendance' }
  | { kind: 'moveAttendance'; record: AttendanceRecord };

type DbResult = {
  error: { message: string } | null;
  data?: unknown[] | null;
};

/* ----------------------------- Config ----------------------------- */

const ROLES: RoleName[] = ['student', 'teacher', 'admin'];

const adminFeatures: Feature[] = [
  {
    title: 'Manage Users',
    description: 'View accounts and change user roles.',
    icon: 'people-outline',
    color: '#D4D4D8',
    action: 'users',
  },
  {
    title: 'Manage Events',
    description: 'Create, view, edit, close or delete any event.',
    icon: 'calendar-outline',
    color: '#A1A1AA',
    action: 'events',
  },
  {
    title: 'Overall Attendance',
    description: 'View attendance records across all events.',
    icon: 'clipboard-outline',
    color: '#E4E4E7',
    action: 'attendance',
  },
  {
    title: 'Correct Attendance',
    description: 'Add missing, move, or remove attendance records.',
    icon: 'create-outline',
    color: '#D4D4D8',
    action: 'corrections',
  },
  {
    title: 'System Records & Reports',
    description: 'Review totals, per-event summaries, and export CSV.',
    icon: 'document-text-outline',
    color: '#D4D4D8',
    action: 'reports',
  },
];

const RLS_HINT =
  'Nothing was saved. Your admin permissions (RLS policies) are probably missing — run admin_policies.sql in the Supabase SQL Editor.';

/* ----------------------------- Helpers ----------------------------- */

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/* ----------------------------- Screen ----------------------------- */

export default function AdminScreen() {
  const [section, setSection] = useState<FeatureAction | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);

  /* ------------------------- Data loading ------------------------- */

  const loadDashboard = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setIsAdmin(false);
      }
      setErrorMessage('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setIsAdmin(false);
          setErrorMessage('Please sign in to access the admin dashboard.');
          return;
        }

        setCurrentUserId(user.id);

        const { data: currentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (currentProfile?.role !== 'admin') {
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setIsAdmin(false);
          setErrorMessage(
            'Only administrators are allowed to access this dashboard.'
          );
          return;
        }

        const [
          { data: userData, error: usersError },
          { data: eventData, error: eventsError },
          { data: attendanceData, error: attendanceError },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, role, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select(
              'id, event_code, title, start_time, end_time, created_by, created_at'
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('attendance')
            .select('id, student_id, event_id, scanned_at')
            .order('scanned_at', { ascending: false }),
        ]);

        if (usersError) throw usersError;
        if (eventsError) throw eventsError;
        if (attendanceError) throw attendanceError;

        setProfiles((userData ?? []) as Profile[]);
        setEvents((eventData ?? []) as EventRecord[]);
        setAttendance((attendanceData ?? []) as AttendanceRecord[]);
        setIsAdmin(true);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to verify administrator access.';

        if (isRefresh) {
          setNotice({ type: 'error', text: message });
        } else {
          setIsAdmin(false);
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setErrorMessage(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ------------------------- Mutations ------------------------- */

  const mutate = async (
    action: () => PromiseLike<DbResult>,
    successText: string
  ): Promise<boolean> => {
    setBusy(true);
    setNotice(null);

    try {
      const { error, data } = await action();

      if (error) {
        setNotice({
          type: 'error',
          text:
            error.message.includes('duplicate') ||
            error.message.includes('unique')
              ? 'That record already exists.'
              : error.message,
        });
        return false;
      }

      if (data && data.length === 0) {
        setNotice({ type: 'error', text: RLS_HINT });
        return false;
      }

      setNotice({ type: 'success', text: successText });
      await loadDashboard(true);
      return true;
    } catch (e: unknown) {
      setNotice({
        type: 'error',
        text: e instanceof Error ? e.message : 'Something went wrong.',
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const changeRole = (profile: Profile, role: RoleName) => {
    if (profile.role === role) return;

    if (profile.id === currentUserId) {
      setNotice({
        type: 'error',
        text: 'You cannot change your own role. Ask another admin.',
      });
      return;
    }

    void mutate(
      () =>
        supabase
          .from('profiles')
          .update({ role })
          .eq('id', profile.id)
          .select('id'),
      `${profile.full_name || profile.email} is now ${role}.`
    );
  };

  const askDeleteAttendance = (record: AttendanceRecord) => {
    setModal({
      kind: 'confirm',
      title: 'Remove attendance?',
      message: `Remove ${getStudentName(record.student_id)} from "${getEventName(
        record.event_id
      )}"?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        setModal(null);
        void mutate(
          () =>
            supabase
              .from('attendance')
              .delete()
              .eq('id', record.id)
              .select('id'),
          'Attendance record removed.'
        );
      },
    });
  };

  const addAttendance = async (studentId: string, eventId: string) => {
    if (!studentId || !eventId) {
      return 'Choose both a student and an event.';
    }
    const ok = await mutate(
      () =>
        supabase
          .from('attendance')
          .insert([{ student_id: studentId, event_id: eventId }])
          .select('id'),
      'Attendance added.'
    );
    if (ok) setModal(null);
    return null;
  };

  const moveAttendance = async (record: AttendanceRecord, eventId: string) => {
    if (!eventId || eventId === record.event_id) {
      return 'Choose a different event.';
    }
    const ok = await mutate(
      () =>
        supabase
          .from('attendance')
          .update({ event_id: eventId })
          .eq('id', record.id)
          .select('id'),
      'Attendance moved.'
    );
    if (ok) setModal(null);
    return null;
  };

  /* ------------------------- Derived data ------------------------- */

  const selectedFeature = adminFeatures.find((f) => f.action === section);

  const getStudentName = (studentId: string): string => {
    const profile = profiles.find((item) => item.id === studentId);
    return (
      profile?.full_name ||
      profile?.email ||
      `Student ID: ${studentId.slice(0, 8)}`
    );
  };

  const getEventName = (eventId: string): string => {
    const event = events.find((item) => item.id === eventId);
    return event?.title || `Event ID: ${eventId.slice(0, 8)}`;
  };

  const formatDate = (value?: string | null): string => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString();
  };

  const visibleAttendance = useMemo(
    () =>
      eventFilter
        ? attendance.filter((a) => a.event_id === eventFilter)
        : attendance,
    [attendance, eventFilter]
  );

  const perEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendance.forEach((a) => {
      counts[a.event_id] = (counts[a.event_id] ?? 0) + 1;
    });
    return counts;
  }, [attendance]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { student: 0, teacher: 0, admin: 0 };
    profiles.forEach((p) => {
      counts[p.role] = (counts[p.role] ?? 0) + 1;
    });
    return counts;
  }, [profiles]);

  const getSectionCount = (action: FeatureAction): number => {
    switch (action) {
      case 'users':
        return profiles.length;
      case 'events':
        return events.length;
      case 'attendance':
      case 'corrections':
        return attendance.length;
      case 'reports':
        return events.length;
    }
  };

  const exportCsv = async () => {
    const header = [
      'Student',
      'Email',
      'Event',
      'Event code',
      'Scanned at',
    ].join(',');

    const rows = attendance.map((a) => {
      const p = profiles.find((x) => x.id === a.student_id);
      const e = events.find((x) => x.id === a.event_id);
      return [
        csvCell(p?.full_name ?? ''),
        csvCell(p?.email ?? a.student_id),
        csvCell(e?.title ?? a.event_id),
        csvCell(e?.event_code ?? ''),
        csvCell(new Date(a.scanned_at).toISOString()),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'attendance-report.csv';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: 'Attendance report' });
      }
      setNotice({ type: 'success', text: 'Report exported.' });
    } catch {
      setNotice({ type: 'error', text: 'Could not export the report.' });
    }
  };

  /* ------------------------- Section content ------------------------- */

  const renderEventChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
    >
      <TouchableOpacity
        style={[styles.chip, !eventFilter && styles.chipActive]}
        hitSlop={6}
        onPress={() => setEventFilter(null)}
      >
        <Text style={[styles.chipText, !eventFilter && styles.chipTextActive]}>
          All events
        </Text>
      </TouchableOpacity>
      {events.map((e) => (
        <TouchableOpacity
          key={e.id}
          style={[styles.chip, eventFilter === e.id && styles.chipActive]}
          hitSlop={6}
          onPress={() => setEventFilter(e.id)}
        >
          <Text
            style={[
              styles.chipText,
              eventFilter === e.id && styles.chipTextActive,
            ]}
          >
            {e.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSectionContent = (): React.ReactNode => {
    if (!section || !selectedFeature) return null;

    /* -------- Users section (table) -------- */
    if (section === 'users') {
      if (profiles.length === 0) {
        return (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No user profiles found.</Text>
          </View>
        );
      }

      const userColumns: Column<Profile>[] = [
        {
          key: 'full_name',
          label: 'Name',
          width: 180,
          render: (item) => (
            <View style={styles.tableCellInner}>
              <Text style={styles.tableTitle}>
                {item.full_name || 'Unnamed User'}
                {item.id === currentUserId ? ' (you)' : ''}
              </Text>
              <Text style={styles.tableSub}>{item.email}</Text>
            </View>
          ),
        },
        {
          key: 'role',
          label: 'Role',
          width: 120,
          align: 'center',
          render: (item) => (
            <View style={styles.rolePillWrap}>
              <View
                style={[
                  styles.roleChip,
                  item.role === 'admin' && styles.roleChipAdmin,
                  item.role === 'teacher' && styles.roleChipTeacher,
                  item.role === 'student' && styles.roleChipStudent,
                ]}
              >
                <Text style={styles.roleChipText}>{item.role}</Text>
              </View>
            </View>
          ),
        },
        {
          key: 'joined',
          label: 'Joined',
          width: 160,
          align: 'center',
          render: (item) => (
            <Text style={styles.tableSub}>{formatDate(item.created_at)}</Text>
          ),
        },
        {
          key: 'actions',
          label: 'Change role',
          width: 140,
          align: 'center',
          render: (item) => (
            <View style={styles.tableActionWrap}>
              {ROLES.map((r) => {
                const active = item.role === r;
                const isSelf = item.id === currentUserId;
                return (
                  <TouchableOpacity
                    key={r}
                    disabled={busy || isSelf}
                    hitSlop={6}
                    onPress={() => changeRole(item, r)}
                    style={[
                      styles.roleChipSmall,
                      active && styles.roleChipActive,
                      isSelf && !active && styles.disabled,
                    ]}
                  >
                    <Text style={[styles.roleChipTextSmall, active && styles.roleChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ),
        },
      ];

      return (
        <DataTable
          data={profiles}
          columns={userColumns}
          rowId={(item) => item.id}
          title="User directory"
          subtitle="Every registered profile and their current role."
          icon="people-outline"
          searchPlaceholder="Search name, email or role…"
          pageSize={10}
          emptyTitle="No user profiles found"
          emptyMessage="There are no user profiles in the system yet."
          emptyIcon="people-outline"
          stripe
        />
      );
    }

    if (section === 'events') {
      return (
        <EventManager
          scope="all"
          userId={currentUserId}
          canDelete
          onChanged={() => void loadDashboard(true)}
        />
      );
    }

    /* -------- Attendance / Corrections section (table) -------- */
    if (section === 'attendance' || section === 'corrections') {
      const isCorrections = section === 'corrections';

      return (
        <>
          {isCorrections && (
            <View style={styles.addWrap}>
              <CampusButton
                variant="primary"
                title="Add Missing Attendance"
                icon="add-circle-outline"
                onPress={() => setModal({ kind: 'addAttendance' })}
              />
            </View>
          )}

          {renderEventChips()}

          {visibleAttendance.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          ) : (
            <DataTable
              data={visibleAttendance}
              columns={[
                {
                  key: 'student',
                  label: 'Student',
                  width: 170,
                  render: (item) => (
                    <View style={styles.tableCellInner}>
                      <Text style={styles.tableTitle}>
                        {getStudentName(item.student_id)}
                      </Text>
                      <Text style={styles.tableSub}>
                        {item.student_id.slice(0, 8)}
                      </Text>
                    </View>
                  ),
                },
                {
                  key: 'event',
                  label: 'Event',
                  width: 170,
                  render: (item) => (
                    <Text style={styles.tableSub} numberOfLines={1}>
                      {getEventName(item.event_id)}
                    </Text>
                  ),
                },
                {
                  key: 'scanned_at',
                  label: 'Scanned at',
                  width: 170,
                  align: 'center',
                  sortable: true,
                  render: (item) => (
                    <Text style={styles.tableSub}>
                      {formatDate(item.scanned_at)}
                    </Text>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  width: 120,
                  align: 'center',
                  render: (item) => (
                    <View style={styles.tableActionWrap}>
                      {isCorrections && (
                        <>
                          <TouchableOpacity
                            style={styles.iconButton}
                            hitSlop={6}
                            onPress={() =>
                              setModal({ kind: 'moveAttendance', record: item })
                            }
                          >
                            <Ionicons
                              name="swap-horizontal-outline"
                              size={16}
                              color={CAMPUS.accent}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, styles.iconButtonDanger]}
                            hitSlop={6}
                            onPress={() => askDeleteAttendance(item)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={CAMPUS.danger}
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ),
                },
              ]}
              rowId={(item) => item.id}
              title={
                isCorrections ? 'Attendance corrections' : 'Attendance records'
              }
              subtitle={
                eventFilter
                  ? 'Filtered to the selected event.'
                  : 'All recorded check-ins across campus events.'
              }
              icon="clipboard-outline"
              searchPlaceholder="Search students or events…"
              pageSize={12}
              emptyTitle="No attendance records found"
              emptyMessage="There are no attendance records to display."
              emptyIcon="clipboard-outline"
              stripe
            />
          )}
        </>
      );
    }

    /* -------- Reports section (table) -------- */
    return (
      <>
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>System Summary</Text>

          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Total user profiles</Text>
            <Text style={styles.reportValue}>{profiles.length}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Students / Teachers / Admins</Text>
            <Text style={styles.reportValue}>
              {roleCounts.student} / {roleCounts.teacher} / {roleCounts.admin}
            </Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Total events</Text>
            <Text style={styles.reportValue}>{events.length}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Attendance records</Text>
            <Text style={styles.reportValue}>{attendance.length}</Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          {events.length === 0 ? (
            <Text style={styles.reportNote}>No events yet.</Text>
          ) : (
            <DataTable
              data={events}
              columns={[
                {
                  key: 'title',
                  label: 'Event',
                  width: 260,
                  render: (item) => (
                    <View style={styles.tableCellInner}>
                      <Text style={styles.tableTitle}>{item.title}</Text>
                      <Text style={styles.tableSub}>{item.event_code}</Text>
                    </View>
                  ),
                },
                {
                  key: 'count',
                  label: 'Records',
                  width: 140,
                  align: 'center',
                  render: (item) => (
                    <Text style={styles.reportValue}>
                      {perEventCounts[item.id] ?? 0}
                    </Text>
                  ),
                },
              ]}
              rowId={(item) => item.id}
              title="Attendance per event"
              subtitle="Check-in totals grouped by event."
              icon="bar-chart-outline"
              searchPlaceholder="Search events…"
              pageSize={10}
              emptyTitle="No events"
              emptyMessage="There are no events to summarize."
              emptyIcon="calendar-outline"
              stripe
            />
          )}
        </View>

        <View style={[styles.addWrap, { marginTop: 16 }]}>
          <CampusButton
            variant="primary"
            title="Export Attendance CSV"
            icon="download-outline"
            onPress={() => void exportCsv()}
          />
        </View>
      </>
    );
  };

  /* ------------------------- Early returns ------------------------- */

  if (loading) {
    return (
      <View style={styles.container}>
        <CampusBackground />
        <StatusBar barStyle="light-content" backgroundColor="#0C0D10" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={CAMPUS.accent} />
          <Text style={styles.loadingText}>
            Verifying administrator access…
          </Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <CampusBackground />
        <StatusBar barStyle="light-content" backgroundColor="#0C0D10" />
        <View style={styles.centerContent}>
          <View style={styles.accessIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={38}
              color={CAMPUS.accent}
            />
          </View>
          <Text style={styles.accessTitle}>Admin Access Only</Text>
          <Text style={styles.accessDescription}>
            {errorMessage ||
              'Only administrators are allowed to access this section.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void loadDashboard()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Check Access Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const noticeView = notice ? (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setNotice(null)}
      style={[
        styles.noticeCard,
        notice.type === 'success' ? styles.noticeSuccess : styles.errorCard,
      ]}
    >
      <Ionicons
        name={
          notice.type === 'success'
            ? 'checkmark-circle-outline'
            : 'alert-circle-outline'
        }
        size={20}
        color={notice.type === 'success' ? CAMPUS.mint : CAMPUS.danger}
      />
      <Text
        style={
          notice.type === 'success' ? styles.noticeSuccessText : styles.errorText
        }
      >
        {notice.text}
      </Text>
    </TouchableOpacity>
  ) : null;

  /* ------------------------- Main render ------------------------- */

  return (
    <View style={styles.container}>
      <CampusBackground />
      <StatusBar barStyle="light-content" backgroundColor="#0C0D10" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor={CAMPUS.accent}
            colors={[CAMPUS.accent]}
            progressBackgroundColor={CAMPUS.bgDeep}
          />
        }
      >
        {section ? (
          <>
            <View style={styles.sectionTopBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setSection(null);
                  setNotice(null);
                  setEventFilter(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Back to administration tools"
              >
                <Ionicons name="arrow-back" size={22} color={CAMPUS.text} />
              </TouchableOpacity>

              <View style={styles.sectionTopText}>
                <Text style={styles.eyebrow}>QR-ATT MANAGEMENT</Text>
                <Text style={styles.title}>{selectedFeature?.title}</Text>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => void loadDashboard(true)}
                accessibilityRole="button"
                accessibilityLabel="Refresh dashboard data"
              >
                <Ionicons name="refresh-outline" size={22} color={CAMPUS.accent} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionSubtitle}>
              {selectedFeature?.description}
            </Text>

            <View style={styles.countCard}>
              <Text style={styles.countLabel}>Records found</Text>
              <Text style={styles.countValue}>
                {section === 'attendance' || section === 'corrections'
                  ? visibleAttendance.length
                  : getSectionCount(section)}
              </Text>
            </View>

            {noticeView}
            {renderSectionContent()}
          </>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>QR-ATT MANAGEMENT</Text>
                <Text style={styles.title}>Administrator</Text>
                <Text style={styles.subtitle}>
                  Manage your attendance system in one place.
                </Text>
              </View>
              <View style={styles.adminIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={30}
                  color={CAMPUS.accent}
                />
              </View>
            </View>

            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Administration Panel</Text>
                <Text style={styles.welcomeDescription}>
                  Manage users, events, attendance, and reports.
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={22} color={CAMPUS.accent} />
                <Text style={styles.statValue}>{profiles.length}</Text>
                <Text style={styles.statLabel}>Users</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={22} color="#A1A1AA" />
                <Text style={styles.statValue}>{events.length}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={CAMPUS.mint}
                />
                <Text style={styles.statValue}>{attendance.length}</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
            </View>

            {noticeView}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Administration Tools</Text>
              <Text style={styles.sectionSubtitle}>
                Select a feature to continue
              </Text>
            </View>

            {adminFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.action}
                style={styles.featureCard}
                activeOpacity={0.75}
                onPress={() => {
                  setNotice(null);
                  setSection(feature.action);
                }}
                accessibilityRole="button"
                accessibilityLabel={feature.title}
              >
                <View
                  style={[
                    styles.featureIcon,
                    {
                      backgroundColor: `${feature.color}22`,
                      borderColor: `${feature.color}55`,
                    },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={26}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <View style={styles.featureRight}>
                  <Text style={styles.featureCount}>
                    {getSectionCount(feature.action)}
                  </Text>
                  <Ionicons name="chevron-forward" size={21} color={CAMPUS.textMuted} />
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.securityCard}>
              <Ionicons name="lock-closed-outline" size={21} color={CAMPUS.textMuted} />
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Administrator Access</Text>
                <Text style={styles.securityDescription}>
                  Your account is checked against the admin role in Supabase.
                  Changes are enforced by database policies, not just this
                  screen.
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>QR-ATT Attendance System</Text>
          </>
        )}
      </ScrollView>

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <ModalHost
        modal={modal}
        close={() => setModal(null)}
        profiles={profiles}
        events={events}
        addAttendance={addAttendance}
        moveAttendance={moveAttendance}
        getStudentName={getStudentName}
        getEventName={getEventName}
      />
    </View>
  );
}

/* ----------------------------- Modals ----------------------------- */

type ModalHostProps = {
  modal: ModalState;
  close: () => void;
  profiles: Profile[];
  events: EventRecord[];
  addAttendance: (studentId: string, eventId: string) => Promise<string | null>;
  moveAttendance: (
    record: AttendanceRecord,
    eventId: string
  ) => Promise<string | null>;
  getStudentName: (id: string) => string;
  getEventName: (id: string) => string;
};

function ModalHost(props: ModalHostProps) {
  const { modal, close } = props;

  return (
    <Modal
      visible={modal !== null}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {modal?.kind === 'confirm' && (
            <>
              <Text style={styles.modalTitle}>{modal.title}</Text>
              <Text style={styles.modalMessage}>{modal.message}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={close}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDanger}
                  onPress={modal.onConfirm}
                >
                  <Text style={styles.modalConfirmText}>
                    {modal.confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {modal?.kind === 'addAttendance' && (
            <AddAttendanceForm
              profiles={props.profiles}
              events={props.events}
              onSave={props.addAttendance}
              onCancel={close}
            />
          )}

          {modal?.kind === 'moveAttendance' && (
            <MoveAttendanceForm
              record={modal.record}
              events={props.events}
              studentName={props.getStudentName(modal.record.student_id)}
              currentEvent={props.getEventName(modal.record.event_id)}
              onSave={props.moveAttendance}
              onCancel={close}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string; sub?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (options.length === 0) {
    return <Text style={styles.emptyTextSmall}>Nothing to choose from.</Text>;
  }

  return (
    <ScrollView style={styles.optionList} nestedScrollEnabled>
      {options.map((o) => {
        const active = o.id === selected;
        return (
          <TouchableOpacity
            key={o.id}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(o.id)}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {o.label}
            </Text>
            {o.sub ? <Text style={styles.optionSub}>{o.sub}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function AddAttendanceForm({
  profiles,
  events,
  onSave,
  onCancel,
}: {
  profiles: Profile[];
  events: EventRecord[];
  onSave: ModalHostProps['addAttendance'];
  onCancel: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const students = profiles.filter((p) => p.role === 'student');

  return (
    <>
      <Text style={styles.modalTitle}>Add Missing Attendance</Text>

      <Text style={styles.inputLabel}>Student</Text>
      <OptionList
        options={students.map((s) => ({
          id: s.id,
          label: s.full_name || s.email,
          sub: s.full_name ? s.email : undefined,
        }))}
        selected={studentId}
        onSelect={setStudentId}
      />

      <Text style={styles.inputLabel}>Event</Text>
      <OptionList
        options={events.map((e) => ({ id: e.id, label: e.title, sub: e.event_code }))}
        selected={eventId}
        onSelect={setEventId}
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalPrimary}
          onPress={async () => setError(await onSave(studentId, eventId))}
        >
          <Text style={styles.modalConfirmText}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function MoveAttendanceForm({
  record,
  events,
  studentName,
  currentEvent,
  onSave,
  onCancel,
}: {
  record: AttendanceRecord;
  events: EventRecord[];
  studentName: string;
  currentEvent: string;
  onSave: ModalHostProps['moveAttendance'];
  onCancel: () => void;
}) {
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.modalTitle}>Move Attendance</Text>
      <Text style={styles.modalMessage}>
        {studentName} is currently recorded for "{currentEvent}". Choose the
        correct event:
      </Text>

      <OptionList
        options={events
          .filter((e) => e.id !== record.event_id)
          .map((e) => ({ id: e.id, label: e.title, sub: e.event_code }))}
        selected={eventId}
        onSelect={setEventId}
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalPrimary}
          onPress={async () => setError(await onSave(record, eventId))}
        >
          <Text style={styles.modalConfirmText}>Move</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ----------------------------- Styles ----------------------------- */

const SHEET_BG = '#141519';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CAMPUS.bg },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 14, color: CAMPUS.textMuted, fontSize: 14 },
  accessIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: 'rgba(212,212,216,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  accessTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: CAMPUS.text,
    marginTop: 18,
    textAlign: 'center',
  },
  accessDescription: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 24,
    maxWidth: 360,
  },
  primaryButton: {
    backgroundColor: CAMPUS.primary,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 12,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    color: CAMPUS.accent,
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  title: { fontSize: 27, fontWeight: '800', color: CAMPUS.text },
  subtitle: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    lineHeight: 20,
    marginTop: 6,
  },
  adminIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(212,212,216,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    gap: 14,
  },
  welcomeIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: CAMPUS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: { flex: 1 },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: 5,
  },
  welcomeDescription: { fontSize: 12, color: '#E4E4E7', lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: CAMPUS.text, marginTop: 7 },
  statLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: CAMPUS.textMuted,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: CAMPUS.text },
  sectionSubtitle: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    marginTop: 5,
    lineHeight: 20,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CAMPUS.surface,
    padding: 15,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    gap: 13,
  },
  featureIcon: {
    width: 49,
    height: 49,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: 4,
  },
  featureDescription: { fontSize: 12, color: CAMPUS.textMuted, lineHeight: 18 },
  featureRight: { alignItems: 'center', gap: 3 },
  featureCount: {
    fontFamily: CAMPUS.mono,
    fontSize: 12,
    fontWeight: '700',
    color: CAMPUS.accent,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 15,
    marginTop: 13,
    gap: 12,
  },
  securityText: { flex: 1 },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: 5,
  },
  securityDescription: { fontSize: 12, color: CAMPUS.textMuted, lineHeight: 18 },
  footer: {
    fontFamily: CAMPUS.mono,
    textAlign: 'center',
    color: CAMPUS.textFaint,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 26,
  },
  sectionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTopText: { flex: 1 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(212,212,216,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    padding: 18,
    borderRadius: 18,
    marginTop: 18,
    marginBottom: 18,
  },
  countLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#D4D4D8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  countValue: { fontSize: 34, fontWeight: '800', color: CAMPUS.text, marginTop: 5 },

  /* Table-specific additions */
  emptyWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: CAMPUS.textMuted, fontSize: 14, textAlign: 'center' },
  emptyTextSmall: { color: CAMPUS.textMuted, fontSize: 13, paddingVertical: 8 },
  tableCellInner: { minWidth: 0 },
  tableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CAMPUS.text,
  },
  tableSub: {
    fontSize: 11,
    color: CAMPUS.textMuted,
    marginTop: 2,
  },
  rolePillWrap: { justifyContent: 'center' },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    backgroundColor: CAMPUS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChipAdmin: {
    backgroundColor: 'rgba(228,228,231,0.12)',
    borderColor: 'rgba(228,228,231,0.4)',
  },
  roleChipTeacher: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  roleChipStudent: {
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderColor: 'rgba(212,212,216,0.35)',
  },
  roleChipText: {
    fontFamily: CAMPUS.mono,
    fontSize: 10,
    fontWeight: '700',
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roleChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    backgroundColor: CAMPUS.surface,
    marginRight: 4,
    marginBottom: 4,
  },
  roleChipActive: {
    backgroundColor: 'rgba(212,212,216,0.16)',
    borderColor: CAMPUS.accent,
  },
  roleChipTextSmall: {
    fontFamily: CAMPUS.mono,
    fontSize: 9,
    fontWeight: '700',
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roleChipTextActive: { color: CAMPUS.accent },
  disabled: { opacity: 0.4 },
  tableActionWrap: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  addWrap: { marginBottom: 14 },

  chipScroll: { marginBottom: 14, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(212,212,216,0.14)',
    borderColor: CAMPUS.accent,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: CAMPUS.textMuted },
  chipTextActive: { color: CAMPUS.accent },

  reportCard: {
    backgroundColor: CAMPUS.surface,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  reportLabel: { fontSize: 13, color: CAMPUS.textMuted, flex: 1 },
  reportValue: { fontSize: 17, fontWeight: '800', color: CAMPUS.text },
  reportNote: { fontSize: 12, color: CAMPUS.textMuted, lineHeight: 19 },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: CAMPUS.dangerBg,
    borderWidth: 1,
    borderColor: CAMPUS.dangerBorder,
    marginBottom: 15,
  },
  errorText: { flex: 1, color: CAMPUS.danger, fontSize: 12, lineHeight: 18 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    marginBottom: 15,
  },
  noticeSuccess: {
    backgroundColor: 'rgba(228,228,231,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(228,228,231,0.35)',
  },
  noticeSuccessText: {
    flex: 1,
    color: CAMPUS.mint,
    fontSize: 12,
    lineHeight: 18,
  },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,5,7,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,5,7,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: SHEET_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 22,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: CAMPUS.textMuted },
  modalPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: CAMPUS.primary,
    alignItems: 'center',
  },
  modalDanger: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#EF4444',
  },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  inputLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: CAMPUS.textMuted,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderColor: CAMPUS.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: CAMPUS.text,
    backgroundColor: CAMPUS.inputBg,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    color: CAMPUS.textFaint,
  },
  formError: {
    color: CAMPUS.danger,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },

  optionList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 18,
    backgroundColor: CAMPUS.inputBg,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  optionActive: { backgroundColor: 'rgba(212,212,216,0.14)' },
  optionText: { fontSize: 13, color: CAMPUS.text, fontWeight: '600' },
  optionTextActive: { color: CAMPUS.accent },
  optionSub: { fontSize: 11, color: CAMPUS.textMuted, marginTop: 2 },

  qrBox: { alignItems: 'center', paddingVertical: 14 },
  qrCode: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 14,
  },
});
