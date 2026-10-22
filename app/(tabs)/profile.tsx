import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, Profile } from '@/lib/profiles';
import { LIMITS, validateFullName } from '@/lib/validation';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const isTiny = width < 320;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;

    // Input validation
    const nameCheck = validateFullName(draftName);

    if (!nameCheck.ok) {
      setNameError(nameCheck.message);
      return;
    }

    setNameError(null);
    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: nameCheck.value,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: nameCheck.value,
            }
          : prev
      );

      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const role = profile?.role?.toLowerCase();

  const roleLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'teacher'
        ? 'Teacher'
        : role === 'student'
          ? 'Student'
          : 'Loading...';

  // Look-only: colours + icon for the role badge
  const roleBadgeStyle =
    role === 'admin'
      ? styles.roleBadgeAdmin
      : role === 'teacher'
        ? styles.roleBadgeTeacher
        : styles.roleBadgeStudent;

  const roleTextStyle =
    role === 'admin'
      ? styles.roleTextAdmin
      : role === 'teacher'
        ? styles.roleTextTeacher
        : styles.roleTextStudent;

  const roleIcon: keyof typeof Ionicons.glyphMap =
    role === 'admin'
      ? 'shield-checkmark'
      : role === 'teacher'
        ? 'school'
        : 'person';

  const roleIconColor =
    role === 'admin'
      ? CAMPUS.mint
      : role === 'teacher'
        ? '#D4D4D8'
        : CAMPUS.accent;

  const initials = getInitials(profile?.full_name, user?.email);

  return (
    <View style={styles.container}>
      <CampusBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>My Profile</Text>

        {user && (
          <>
            {/* Avatar + role */}
            <View style={styles.hero}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>

              <View style={[styles.roleBadge, roleBadgeStyle]}>
                <Ionicons name={roleIcon} size={14} color={roleIconColor} />
                <Text style={[styles.roleBadgeText, roleTextStyle]}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={[styles.infoCard, isCompact && styles.infoCardCompact]}>
              <Text style={styles.label}>NAME</Text>

              {editing ? (
                <View style={[styles.nameEditRow, isTiny && styles.nameEditRowStacked]}>
                  <TextInput
                    style={[styles.nameInput, isTiny && styles.nameInputStacked]}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your name"
                    maxLength={LIMITS.name}
                    placeholderTextColor={CAMPUS.textFaint}
                    editable={!saving}
                  />

                  <Pressable
                    accessibilityRole="button"
                    style={[styles.saveButton, isTiny && styles.saveButtonStacked, saving && styles.saveButtonBusy]}
                    onPress={handleSaveName}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={styles.nameRow}
                >
                  <Text
                    style={[
                      styles.value,
                      !profile?.full_name && styles.valuePlaceholder,
                    ]}
                  >
                    {profile?.full_name || 'Tap to add your name'}
                  </Text>

                  <View style={styles.editChip}>
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={CAMPUS.accent}
                    />
                    <Text style={styles.editHint}>Edit</Text>
                  </View>
                </Pressable>
              )}

              {nameError ? (
                <Text style={styles.nameError}>{nameError}</Text>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.valueRow}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={CAMPUS.textMuted}
                />
                <Text style={styles.value}>{user.email}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>USER ID</Text>
              <View style={styles.valueRow}>
                <Ionicons
                  name="finger-print-outline"
                  size={17}
                  color={CAMPUS.textMuted}
                />
                <Text style={styles.valueSmall} selectable>
                  {user.id}
                </Text>
              </View>
            </View>
          </>
        )}

        <CampusButton
          variant="danger"
          title="Sign Out"
          icon="log-out-outline"
          onPress={handleSignOut}
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name && name.trim()) || (email && email.trim()) || '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  if (parts.length >= 2 && name && name.trim()) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
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
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  contentCompact: {
    paddingHorizontal: 12,
    paddingTop: 16,
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
    marginBottom: 20,
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: CAMPUS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: CAMPUS.text,
    letterSpacing: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 16,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(228,228,231,0.12)',
    borderColor: 'rgba(228,228,231,0.4)',
  },
  roleBadgeTeacher: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  roleBadgeStudent: {
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderColor: 'rgba(212,212,216,0.35)',
  },
  roleBadgeText: {
    fontFamily: CAMPUS.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roleTextAdmin: { color: CAMPUS.mint },
  roleTextTeacher: { color: '#D4D4D8' },
  roleTextStudent: { color: CAMPUS.accent },

  /* Details card */
  infoCard: {
    backgroundColor: CAMPUS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  infoCardCompact: {
    padding: 14,
    borderRadius: 18,
  },
  label: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: CAMPUS.textMuted,
    marginBottom: 8,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: CAMPUS.text,
    fontWeight: '600',
    minWidth: 0,
  },
  valuePlaceholder: {
    color: CAMPUS.textFaint,
    fontWeight: '500',
  },
  valueSmall: {
    flex: 1,
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    color: CAMPUS.textMuted,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.3)',
  },
  editHint: {
    fontSize: 12,
    color: CAMPUS.accent,
    fontWeight: '700',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    minWidth: 0,
  },
  nameEditRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: CAMPUS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CAMPUS.accent,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: CAMPUS.text,
  },
  nameInputStacked: {
    flex: 0,
    width: '100%',
  },
  saveButton: {
    backgroundColor: CAMPUS.primary,
    borderRadius: 10,
    minHeight: 38,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  saveButtonStacked: {
    alignSelf: 'flex-end',
  },
  nameError: {
    color: CAMPUS.danger,
    fontSize: 12,
    marginTop: 8,
  },
  saveButtonBusy: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});