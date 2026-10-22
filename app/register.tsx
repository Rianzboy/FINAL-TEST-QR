import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import CampusBackground from '@/components/CampusBackground';
import ScanLogo from '@/components/ScanLogo';
import { CAMPUS } from '@/constants/colors';
import { signUp } from '@/lib/auth';
import {
  LIMITS,
  validateEmail,
  validateFullName,
  validateNewPassword,
} from '@/lib/validation';

/* Blue gradient fill used inside the Sign Up button */
function ButtonGradient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="registerBtn" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={CAMPUS.primary} />
          <Stop offset="1" stopColor={CAMPUS.primaryDeep} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#registerBtn)" />
      </Svg>
    </View>
  );
}

/* Label + icon + glowing border wrapper shared by every input */
function Field({
  label,
  icon,
  active,
  right,
  onPressBar,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  right?: React.ReactNode;
  onPressBar?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPressBar}
        style={[styles.inputWrap, active && styles.inputWrapFocused]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={active ? CAMPUS.accent : CAMPUS.textMuted}
        />
        {children}
        {right}
      </Pressable>
    </>
  );
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={15}
        color={ok ? CAMPUS.mint : CAMPUS.textFaint}
      />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const backHref = '/login' as const;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Look-and-feel only state
  const [focused, setFocused] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    const nameCheck = validateFullName(fullName);
    if (!nameCheck.ok) {
      setError(nameCheck.message);
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.message);
      return;
    }

    const passwordCheck = validateNewPassword(password);
    if (!passwordCheck.ok) {
      setError(passwordCheck.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        emailCheck.value,
        password,
        {
          full_name: nameCheck.value,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        // Nothing to do here: signUp() has already stored the session, and the
        // root layout (_layout.tsx) sends the student onward: back to the
        // event they scanned, or to the home tabs if there was none.
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Look-only: live checklist for the password rules
  const hasLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CampusBackground />

      <KeyboardAvoidingView
        style={styles.keyboardView}
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
keyboardVerticalOffset={0}
      >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 28 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <View style={styles.brand}>
              <ScanLogo size={72} />
              <Text style={styles.appName}>QR Attendance</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>

              {success ? (
                <View style={styles.successContainer}>
                  <View style={styles.successTile}>
                    <Ionicons
                      name="mail-open-outline"
                      size={30}
                      color={CAMPUS.mint}
                    />
                  </View>
                  <Text style={styles.successTitle}>Check your email!</Text>
                  <Text style={styles.successText}>
                    We sent a confirmation link to {email}. Click the link to
                    verify your account, then come back and sign in.
                  </Text>
                  <Link href={backHref} asChild>
                    <Pressable
                      hitSlop={14}
                      style={styles.linkButton}
                      accessibilityRole="link"
                    >
                      <Text style={styles.link}>
                        Back to Sign In
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              ) : (
                <View style={styles.form}>
                  <Field
                    label="FULL NAME"
                    icon="person-outline"
                    active={focused === 'name'}
                    onPressBar={() => nameRef.current?.focus()}
                  >
                    <TextInput
                      ref={nameRef}
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      maxLength={LIMITS.name}
                      placeholderTextColor={CAMPUS.textFaint}
                      autoCapitalize="words"
                      editable={!loading}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  <View style={styles.roleNoteBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={CAMPUS.accent}
                    />
                    <Text style={styles.roleNote}>
                      New accounts start as students. Teacher access is granted
                      by an administrator after you sign up.
                    </Text>
                  </View>

                  <Field
                    label="EMAIL"
                    icon="mail-outline"
                    active={focused === 'email'}
                    onPressBar={() => emailRef.current?.focus()}
                  >
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your.email@school.edu"
                      placeholderTextColor={CAMPUS.textFaint}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      maxLength={LIMITS.email}
                      editable={!loading}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  <Field
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    active={focused === 'password'}
                    onPressBar={() => passwordRef.current?.focus()}
                    right={
                      <Pressable
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={16}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color={CAMPUS.textMuted}
                        />
                      </Pressable>
                    }
                  >
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 8 characters, with a letter and a number"
                      placeholderTextColor={CAMPUS.textFaint}
                      secureTextEntry={!showPassword}
                      maxLength={LIMITS.password}
                      editable={!loading}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  <View style={styles.rules}>
                    <RuleRow ok={hasLength} text="At least 8 characters" />
                    <RuleRow ok={hasLetter} text="Includes a letter" />
                    <RuleRow ok={hasNumber} text="Includes a number" />
                  </View>

                  <Field
                    label="CONFIRM PASSWORD"
                    icon="shield-checkmark-outline"
                    active={focused === 'confirm'}
                    onPressBar={() => confirmRef.current?.focus()}
                    right={
                      <Pressable
                        onPress={() => setShowConfirm((v) => !v)}
                        hitSlop={16}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirm ? 'Hide password' : 'Show password'
                        }
                      >
                        <Ionicons
                          name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color={CAMPUS.textMuted}
                        />
                      </Pressable>
                    }
                  >
                    <TextInput
                      ref={confirmRef}
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor={CAMPUS.textFaint}
                      secureTextEntry={!showConfirm}
                      maxLength={LIMITS.password}
                      editable={!loading}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  {confirmPassword.length > 0 && (
                    <View style={styles.rules}>
                      <RuleRow ok={matches} text="Passwords match" />
                    </View>
                  )}

                  {error && (
                    <View style={styles.errorBox}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={CAMPUS.danger}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      pressed && styles.buttonPressed,
                      loading && styles.buttonLoading,
                    ]}
                    onPress={handleRegister}
                    disabled={loading}
                    accessibilityRole="button"
                  >
                    <ButtonGradient />
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="person-add-outline"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.buttonText}>Sign Up</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {!success && (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Link href={backHref} asChild>
                  <Pressable
                    hitSlop={14}
                    style={styles.linkButton}
                    accessibilityRole="link"
                  >
                    <Text style={styles.link}>
                      Sign In
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  brand: {
    alignItems: 'center',
    marginBottom: 22,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: CAMPUS.text,
    marginTop: 14,
    letterSpacing: 0.2,
  },

  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: CAMPUS.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    // (frosted-glass backdropFilter removed: it makes scrolling choppy on phones)
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: CAMPUS.text,
  },
  subtitle: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 6,
  },
  form: {
    marginTop: 4,
  },
  label: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: CAMPUS.textMuted,
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CAMPUS.inputBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: CAMPUS.border,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: CAMPUS.accent,
    backgroundColor: 'rgba(212,212,216,0.06)',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: CAMPUS.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },

  roleNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(212,212,216,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.25)',
    borderRadius: 18,
    padding: 12,
    marginTop: 16,
  },
  roleNote: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: CAMPUS.textMuted,
  },

  rules: {
    marginTop: 10,
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    color: CAMPUS.textFaint,
  },
  ruleTextOk: {
    color: CAMPUS.mint,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: CAMPUS.dangerBg,
    borderWidth: 1,
    borderColor: CAMPUS.dangerBorder,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: CAMPUS.danger,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footer: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: CAMPUS.textMuted,
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  link: {
    color: CAMPUS.accent,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },

  successContainer: {
    alignItems: 'center',
    paddingTop: 18,
  },
  successTile: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(228,228,231,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(228,228,231,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
});