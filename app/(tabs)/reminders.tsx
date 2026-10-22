import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
import { supabase } from '@/lib/supabase';

type EventRow = {
  id: string;
  title: string;
  venue?: string | null;
  start_time: string | null;
  end_time: string | null;
  status?: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return 'Time not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time not set'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

function countdownFor(start: string | null) {
  if (!start) return { label: 'Date TBA', live: false };
  const ms = new Date(start).getTime() - Date.now();
  if (Number.isNaN(ms)) return { label: 'Date TBA', live: false };
  if (ms <= 0) return { label: 'In progress', live: true };
  if (ms < 86400000)
    return { label: `In ${Math.max(1, Math.ceil(ms / 3600000))}h`, live: true };
  return { label: `In ${Math.ceil(ms / 86400000)}d`, live: false };
}

export default function RemindersScreen() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(
    'Upcoming events are shown here. Keep this page open to see in-app reminders.'
  );

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id,title,venue,start_time,end_time,status')
      .order('start_time', { ascending: true });
    if (!error && data)
      setEvents(
        data.filter(
          (event: EventRow) =>
            event.status !== 'closed' &&
            (!event.start_time ||
              new Date(event.start_time).getTime() >= Date.now() - 86400000)
        )
      );
    else
      setNotice(
        error?.message ?? 'Could not load events. Check your Supabase permissions.'
      );
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enableNotifications = async () => {
    if (Platform.OS !== 'web') {
      setNotice(
        'Browser notifications are only available on the web version. Upcoming events remain visible here.'
      );
      return;
    }
    const browser = globalThis as any;
    if (!browser.Notification) {
      setNotice('This browser does not support notifications.');
      return;
    }
    try {
      const permission = await browser.Notification.requestPermission();
      if (permission === 'granted') {
        setNotice('Browser notifications enabled while this page is open.');
        const upcoming = events.find(
          (e) => e.start_time && new Date(e.start_time).getTime() > Date.now()
        );
        if (upcoming)
          new browser.Notification('QR-ATT event reminder', {
            body: `${upcoming.title} — ${dateLabel(upcoming.start_time)}`,
          });
      } else
        setNotice(
          'Notifications were not enabled. You can still view upcoming events here.'
        );
    } catch {
      setNotice('Could not enable browser notifications in this environment.');
    }
  };

  const columns: Column<EventRow>[] = [
    {
      key: 'title',
      label: 'Event',
      width: 300,
      sortable: true,
      render: (item) => (
        <View style={styles.primaryCell}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {item.venue || 'Venue not set'}
          </Text>
        </View>
      ),
    },
    {
      key: 'start_time',
      label: 'Starts',
      width: 190,
      sortable: true,
      render: (item) => (
        <Text style={styles.meta}>{dateLabel(item.start_time)}</Text>
      ),
    },
    {
      key: 'end_time',
      label: 'Ends',
      width: 160,
      render: (item) =>
        item.end_time ? (
          <Text style={styles.meta}>{dateLabel(item.end_time)}</Text>
        ) : (
          <Text style={styles.muted}>—</Text>
        ),
    },
    {
      key: 'countdown',
      label: 'Countdown',
      width: 140,
      align: 'center',
      render: (item) => {
        const cd = countdownFor(item.start_time);
        return (
          <View style={[styles.cdPill, cd.live && styles.cdPillLive]}>
            <View style={[styles.cdDot, cd.live && styles.cdDotLive]} />
            <Text style={[styles.cdText, cd.live && styles.cdTextLive]}>
              {cd.label}
            </Text>
          </View>
        );
      },
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
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={CAMPUS.accent}
            colors={[CAMPUS.accent]}
            progressBackgroundColor={CAMPUS.bgDeep}
          />
        }
      >
        <PageHeader
          eyebrow="STAY ON SCHEDULE"
          title="Event Reminders"
          subtitle="Upcoming campus activities and event times from Supabase."
          count={events.length}
          countLabel={events.length === 1 ? 'event' : 'events'}
          icon="notifications-outline"
        />

        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}>
            <Ionicons name="notifications" size={19} color={CAMPUS.accent} />
          </View>
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>In-app reminders</Text>
            <Text style={styles.reminderText}>{notice}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.85 },
            ]}
            onPress={enableNotifications}
            accessibilityRole="button"
          >
            <Ionicons
              name="notifications-outline"
              size={16}
              color={CAMPUS.bgDeep}
            />
            <Text style={styles.buttonText}>Enable notifications</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={CAMPUS.accent} size="large" />
            <Text style={styles.loadingText}>Loading upcoming events…</Text>
          </View>
        ) : (
          <DataTable
            data={events}
            columns={columns}
            rowId={(item) => item.id}
            title="Upcoming events"
            subtitle="The next events on the campus calendar."
            icon="calendar-outline"
            searchPlaceholder="Search events or venues…"
            pageSize={10}
            emptyTitle="No upcoming events"
            emptyMessage="New events will appear here when they are published."
            emptyIcon="calendar-outline"
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
  reminderCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  reminderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.26)',
  },
  reminderCopy: { flex: 1, minWidth: 200 },
  reminderTitle: {
    color: CAMPUS.text,
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  reminderText: { color: CAMPUS.textMuted, fontSize: 11.5, lineHeight: 17 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: CAMPUS.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonText: { color: CAMPUS.bgDeep, fontWeight: '900', fontSize: 12 },
  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { color: CAMPUS.textMuted, fontSize: 13 },
  primaryCell: { minWidth: 0, gap: 3 },
  eventTitle: { color: CAMPUS.text, fontSize: 12.5, fontWeight: '700' },
  eventMeta: { color: CAMPUS.textFaint, fontSize: 10.5 },
  meta: { color: CAMPUS.textMuted, fontSize: 12 },
  muted: { color: CAMPUS.textMuted, fontSize: 12 },
  cdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  cdPillLive: {
    backgroundColor: 'rgba(228,228,231,0.10)',
    borderColor: 'rgba(228,228,231,0.28)',
  },
  cdDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: CAMPUS.textFaint,
  },
  cdDotLive: { backgroundColor: CAMPUS.mint },
  cdText: { color: CAMPUS.textMuted, fontSize: 10, fontWeight: '800' },
  cdTextLive: { color: CAMPUS.mint },
});
