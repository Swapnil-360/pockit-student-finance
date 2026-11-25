import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { authLogin, authRegister, authDemo, authGuest, authGoogle, AuthResponse } from '../services/api';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { BrandLogo } from '../components/BrandLogo';
import { BRANDING } from '../constants/branding';
import { supabase } from '../services/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

const PRESET_AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
];

interface AuthScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  onAuthSuccess: (authData: AuthResponse) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  language,
  onToggleLanguage,
  onAuthSuccess,
}) => {
  const { isDark, theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [googlePickerVisible, setGooglePickerVisible] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string>(PRESET_AVATAR_OPTIONS[0]);

  const t = TRANSLATIONS[language];

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isSignUp && !fullName.trim())) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Required',
        language === 'bn' ? 'দয়া করে সব ঘর পূরণ করুন।' : 'Please fill in all fields.'
      );
      return;
    }

    setLoading(true);
    try {
      let authRes: AuthResponse;
      if (isSignUp) {
        authRes = await authRegister(email.trim(), password.trim(), fullName.trim());
      } else {
        authRes = await authLogin(email.trim(), password.trim());
      }
      onAuthSuccess(authRes);
    } catch (err: any) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Authentication Error',
        err.message || (language === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Authentication failed.')
      );
    } finally {
      setLoading(false);
    }
  };

  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setGuestLoading(true);
    try {
      const guestRes = await authGuest(language);
      onAuthSuccess(guestRes);
    } catch (err: any) {
      Alert.alert(
        language === 'bn' ? 'গেস্ট মোড ত্রুটি' : 'Guest Mode Error',
        String(err.message || err)
      );
    } finally {
      setGuestLoading(false);
    }
  };

  // Real Google OAuth trigger using Supabase with mobile browser / deep link support
  const handleGoogleSignInPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setGoogleLoading(true);
    try {
      const isWeb = Platform.OS === 'web';
      const redirectUri = isWeb
        ? (typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : Linking.createURL('/'))
        : makeRedirectUri({
            scheme: 'pockit',
            path: 'auth/callback',
          });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: !isWeb,
        },
      });

      if (error) throw error;

      if (isWeb) return;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
          showInRecents: true,
        });

        try {
          WebBrowser.dismissAuthSession();
        } catch {}

        if (result.type === 'success' && result.url) {
          const url = result.url;
          let userEmail = '';
          let userName = '';
          let userAvatar = '';

          if (url.includes('access_token=')) {
            const hash = url.split('#')[1] || url.split('?')[1] || '';
            const params: Record<string, string> = {};
            hash.split('&').forEach((part) => {
              const [k, v] = part.split('=');
              if (k && v) params[k] = decodeURIComponent(v);
            });

            if (params.access_token && params.refresh_token) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
              if (sessionData?.session?.user) {
                const u = sessionData.session.user;
                userEmail = u.email || '';
                userName =
                  u.user_metadata?.full_name ||
                  u.user_metadata?.name ||
                  userEmail.split('@')[0];
                userAvatar =
                  u.user_metadata?.avatar_url ||
                  u.user_metadata?.picture ||
                  '';
              }
            }
          } else if (url.includes('code=')) {
            const codeMatch = url.match(/code=([^&]+)/);
            if (codeMatch && codeMatch[1]) {
              const { data: sessionData } = await supabase.auth.exchangeCodeForSession(
                decodeURIComponent(codeMatch[1])
              );
              if (sessionData?.session?.user) {
                const u = sessionData.session.user;
                userEmail = u.email || '';
                userName =
                  u.user_metadata?.full_name ||
                  u.user_metadata?.name ||
                  userEmail.split('@')[0];
                userAvatar =
                  u.user_metadata?.avatar_url ||
                  u.user_metadata?.picture ||
                  '';
              }
            }
          }

          if (!userEmail) {
            const { data: currentSession } = await supabase.auth.getSession();
            if (currentSession?.session?.user) {
              const u = currentSession.session.user;
              userEmail = u.email || '';
              userName =
                u.user_metadata?.full_name ||
                u.user_metadata?.name ||
                userEmail.split('@')[0];
              userAvatar =
                u.user_metadata?.avatar_url ||
                u.user_metadata?.picture ||
                '';
            }
          }

          if (userEmail) {
            const authRes = await authGoogle(userEmail, userName, userAvatar);
            onAuthSuccess(authRes);
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn('Google Sign-In error:', err);
      Alert.alert(
        language === 'bn' ? 'গুগল সাইন-ইন' : 'Google Sign-In',
        err.message ||
          (language === 'bn'
            ? 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।'
            : 'Could not complete Google Sign-In.')
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOpenBrowserOAuth = async () => {
    setGooglePickerVisible(false);
    setGoogleLoading(true);
    try {
      const redirectUri = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
          showInRecents: true,
        });
        console.log('[Google OAuth] WebBrowser result:', result);
        try {
          WebBrowser.dismissAuthSession();
        } catch {}
      }
    } catch (err: any) {
      Alert.alert('Google Sign-In', err.message || 'Could not open browser');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePickCustomAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCustomAvatar(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Avatar Error', err.message || 'Could not pick photo');
    }
  };

  const handleCustomGoogleSignIn = async () => {
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    const cleanName = customGoogleName.trim();

    if (!cleanEmail || !cleanName) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Required',
        language === 'bn' ? 'দয়া করে নাম এবং জিমেইল লিখুন।' : 'Please enter your name and Google email.'
      );
      return;
    }
    if (!cleanEmail.includes('@')) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Invalid Email',
        language === 'bn' ? 'একটি বৈধ জিমেইল বা ইমেইল ঠিকানা দিন।' : 'Please enter a valid Google email.'
      );
      return;
    }

    const avatar = customAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=172330&color=F27A49&size=256`;
    setGooglePickerVisible(false);
    setGoogleLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const authRes = await authGoogle(cleanEmail, cleanName, avatar);
      onAuthSuccess(authRes);
    } catch (err: any) {
      Alert.alert('Google Sign-In Error', err.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;
  const safeBottom = Math.max(insets.bottom, 16);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.canvas }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop, paddingBottom: 40 + safeBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Controls: Theme & Language */}
        <View style={styles.topBar}>
          <View style={[styles.brandBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.brandBadgeText, { color: theme.primary }]}>{BRANDING.appName}</Text>
          </View>

          <View style={styles.topControlsRight}>
            {/* Theme Toggle */}
            <TouchableOpacity
              style={[styles.controlPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                toggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={isDark ? '#F59E0B' : theme.textPrimary}
              />
            </TouchableOpacity>

            {/* Language Switcher */}
            <TouchableOpacity
              style={[styles.controlPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={onToggleLanguage}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'English' : 'বাংলা'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Brand Emblem & Header */}
        <View style={styles.headlineBox}>
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <BrandLogo size="lg" />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{BRANDING.appName}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {language === 'bn' ? BRANDING.appSubtitleBn : BRANDING.appSubtitleEn}
          </Text>
        </View>

        {/* 1. Google One-Tap Sign In / Sign Up Button */}
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.borderMedium }]}
          onPress={handleGoogleSignInPress}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <View style={styles.googleBtnInner}>
              <View style={styles.googleIconBadge}>
                {/* Clean Google "G" representation */}
                <Ionicons name="logo-google" size={18} color="#EA4335" />
              </View>
              <Text style={[styles.googleBtnText, { color: theme.textPrimary }]}>
                {isSignUp
                  ? language === 'bn'
                    ? 'গুগল দিয়ে সাইন আপ করুন'
                    : 'Sign up with Google'
                  : language === 'bn'
                  ? 'গুগল দিয়ে প্রবেশ করুন'
                  : 'Continue with Google'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Subtle emulator/offline fallback option */}
        <TouchableOpacity
          style={styles.manualFallbackBtn}
          onPress={() => {
            if (!customGoogleEmail) {
              setCustomGoogleEmail('miftahurr503@gmail.com');
              setCustomGoogleName('Md. Miftahur Rahman Swapnil');
            }
            setGooglePickerVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.manualFallbackText, { color: theme.textMuted }]}>
            {language === 'bn' ? 'ব্রাউজার ছাড়া ম্যানুয়াল লগইন?' : 'Trouble with browser? Manual login'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>
            {language === 'bn' ? 'অথবা' : 'OR'}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Tab Toggle: Sign In / Sign Up */}
        <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#16191D' : '#E2EAF1', borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, !isSignUp && [styles.segmentBtnActive, { backgroundColor: theme.surface, borderColor: theme.borderMedium }]]}
            onPress={() => setIsSignUp(false)}
          >
            <Text style={[styles.segmentText, { color: !isSignUp ? theme.textPrimary : theme.textMuted }, !isSignUp && styles.segmentTextActive]}>
              {t.signIn}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, isSignUp && [styles.segmentBtnActive, { backgroundColor: theme.surface, borderColor: theme.borderMedium }]]}
            onPress={() => setIsSignUp(true)}
          >
            <Text style={[styles.segmentText, { color: isSignUp ? theme.textPrimary : theme.textMuted }, isSignUp && styles.segmentTextActive]}>
              {t.signUp}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields Card */}
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.nameLabel}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#111A24' : '#F6F9FC', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder={t.namePlaceholder}
                placeholderTextColor={theme.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.emailLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#111A24' : '#F6F9FC', borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.passwordLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#111A24' : '#F6F9FC', borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }, loading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? t.registerBtn : t.loginBtn}
              </Text>
            )}
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => setForgotPasswordVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotBtnText, { color: theme.textMuted }]}>{t.forgotPasswordLink}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Guest Mode Banner (Offline Local Cache) */}
        <View style={[styles.demoBanner, { backgroundColor: theme.surface, borderColor: theme.borderMedium, shadowColor: theme.shadowColor }]}>
          <View style={styles.demoHeader}>
            <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
            <Text style={[styles.demoTitle, { color: theme.primary }]}>{t.quickDemoBtn}</Text>
          </View>
          <Text style={[styles.demoSubtitle, { color: theme.textSecondary }]}>{t.quickDemoSub}</Text>
          <TouchableOpacity
            style={[styles.demoActionBtn, { backgroundColor: theme.powder, borderColor: theme.borderMedium }]}
            onPress={handleGuestSignIn}
            disabled={guestLoading}
            activeOpacity={0.85}
          >
            {guestLoading ? (
              <ActivityIndicator color={theme.textPrimary} size="small" />
            ) : (
              <Text style={[styles.demoActionText, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'গেস্ট হিসেবে শুরু করুন' : 'Continue as Guest'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          visible={forgotPasswordVisible}
          onClose={() => setForgotPasswordVisible(false)}
          language={language}
        />

        {/* Google Account Picker Modal */}
        <Modal
          visible={googlePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGooglePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setGooglePickerVisible(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.borderMedium }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="logo-google" size={24} color="#EA4335" />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'গুগল অ্যাকাউন্ট প্রবেশ করান' : 'Enter Google Account'}
                </Text>
              </View>

              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'আপনার আসল নাম ও জিমেইল দিন। আপনার ড্যাশবোর্ড ও ক্লাউড প্রোফাইল তৈরি হবে।'
                  : 'Enter your real name and Gmail. Your cloud profile and avatar will be synced.'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.nameLabel}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder={language === 'bn' ? 'আপনার পূর্ণ নাম' : 'Your full name'}
                  placeholderTextColor={theme.textMuted}
                  value={customGoogleName}
                  onChangeText={setCustomGoogleName}
                />
              </View>

              <View style={[styles.inputGroup, { marginTop: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.emailLabel}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder={language === 'bn' ? 'আপনার জিমেইল (যেমন: student@gmail.com)' : 'Your Gmail (e.g. student@gmail.com)'}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                />
              </View>

              {/* Avatar Chooser Row */}
              <View style={styles.avatarPickerRow}>
                <Text style={[styles.avatarPickerLabel, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'প্রোফাইল ছবি নির্বাচন করুন:' : 'Choose Profile Picture:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarThumbScroll}>
                  {PRESET_AVATAR_OPTIONS.map((imgUri, idx) => {
                    const isSelected = customAvatar === imgUri;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setCustomAvatar(imgUri)}
                        style={[
                          styles.avatarThumbCircle,
                          { borderColor: isSelected ? theme.primary : theme.borderMedium },
                          isSelected && { borderWidth: 2.5 },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: imgUri }} style={styles.avatarThumbImg} />
                      </TouchableOpacity>
                    );
                  })}

                  {/* Camera Pick Button */}
                  <TouchableOpacity
                    style={[styles.avatarCameraBtn, { backgroundColor: isDark ? '#111A24' : '#EAF2F8', borderColor: theme.border }]}
                    onPress={handlePickCustomAvatar}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={18} color={theme.primary} />
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                onPress={handleCustomGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="logo-google" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
                      {language === 'bn' ? 'গুগল দিয়ে প্রবেশ করুন' : 'Continue with Google'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setGooglePickerVisible(false)}
              >
                <Text style={[styles.cancelModalText, { color: theme.textMuted }]}>
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  brandBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headlineBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  googleBtn: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#466B85',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  manualFallbackBtn: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  manualFallbackText: {
    fontSize: 11.5,
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    paddingHorizontal: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentBtnActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    fontSize: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#F27A49',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  demoBanner: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  demoActionBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  demoActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  googleAvatarWrap: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  googleAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  googleMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uniTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  uniTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  avatarPickerRow: {
    marginTop: 6,
    marginBottom: 6,
  },
  avatarPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  avatarThumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarThumbCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarThumbImg: {
    width: '100%',
    height: '100%',
  },
  avatarCameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAccountBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 6,
  },
  customAccountHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cancelModalBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelModalText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
