import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CampusBackground from '@/components/CampusBackground';
import EventManager from '@/components/EventManager';
import { CAMPUS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setRoleLoading(true);

      if (!user) {
        setRole(null);
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      getProfile(user.id).then((profile) => {
        if (!active) return;

        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });

      return () => {
        active = false;
      };
    }, [user])
  );

  if (roleLoading) {
    return (
      <View style={styles.centerContainer}>
        <CampusBackground />
        <ActivityIndicator size="large" color={CAMPUS.accent} />
        <Text style={styles.centerTitle}>Checking your account...</Text>
      </View>
    );
  }

  if ((role !== 'teacher' && role !== 'admin') || !user) {
    return (
      <View style={styles.centerContainer}>
        <CampusBackground />
        <View style={styles.lockTile}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={CAMPUS.accent}
          />
        </View>
        <Text style={styles.centerTitle}>Teachers Only</Text>
        <Text style={styles.centerSubtitle}>
          Only teacher and administrator accounts can manage events.
        </Text>
      </View>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <View style={styles.container}>
      <CampusBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {isAdmin ? 'ADMIN CONSOLE' : 'TEACHER CONSOLE'}
            </Text>
            <Text style={styles.title}>Event Management</Text>
            <Text style={styles.subtitle}>
              {isAdmin
                ? 'Create, view, edit and close any event.'
                : 'Create, view, edit and close your events.'}
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'school'}
              size={14}
              color={CAMPUS.accent}
            />
            <Text style={styles.roleText}>{isAdmin ? 'ADMIN' : 'TEACHER'}</Text>
          </View>
        </View>

        <EventManager
          scope={isAdmin ? 'all' : 'mine'}
          userId={user.id}
          canDelete={isAdmin}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockTile: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(212,212,216,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  centerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: CAMPUS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 15,
    color: CAMPUS.textMuted,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 360,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: CAMPUS.accent,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    lineHeight: 20,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  roleText: {
    fontFamily: CAMPUS.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: CAMPUS.textMuted,
  },
});