import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TRANSLATIONS, Language } from '../constants/translations';
import { BRANDING } from '../constants/branding';
import { getStoredUser, UserData } from '../services/api';
import { hasPinConfigured } from '../services/security';

interface SplashScreenProps {
  language: Language;
  onFinish: (result: {
    user: UserData | null;
    hasPin: boolean;
  }) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ language, onFinish }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    let isMounted = true;
    let finished = false;

    const safeFinish = (payload: { user: UserData | null; hasPin: boolean }) => {
      if (!finished && isMounted) {
        finished = true;
        onFinish(payload);
      }
    };

    // 1. Smooth entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: useNative,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: useNative,
      }),
    ]).start();

    // 2. Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 700,
      useNativeDriver: false,
    }).start();

    // 3. Subtle gentle breathing pulse for brand emblem
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 900,
          useNativeDriver: useNative,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: useNative,
        }),
      ])
    );
    pulseLoop.start();

    // 4. Complete progress and trigger session transition
    const timer = setTimeout(async () => {
      Animated.timing(progressAnim, {
        toValue: 1.0,
        duration: 200,
        useNativeDriver: false,
      }).start();

      try {
        let storedUser = await getStoredUser();

        // Also check Supabase active session if AsyncStorage user token was cleared
        if (!storedUser) {
          try {
            const { supabase } = await import('../services/supabaseClient');
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              const uEmail = data.session.user.email || '';
              const uName =
                data.session.user.user_metadata?.full_name ||
                data.session.user.user_metadata?.name ||
                uEmail.split('@')[0];
              const uAvatar =
                data.session.user.user_metadata?.avatar_url ||
                data.session.user.user_metadata?.picture;
              const { authGoogle } = await import('../services/api');
              const authRes = await authGoogle(uEmail, uName, uAvatar);
              storedUser = authRes.user;
            }
          } catch {}
        }

        const pinConfigured = await hasPinConfigured();
        safeFinish({
          user: storedUser,
          hasPin: pinConfigured,
        });
      } catch {
        safeFinish({ user: null, hasPin: false });
      }
    }, 950);

    // 5. Safety watchdog timer (guarantees splash never freezes)
    const safetyTimer = setTimeout(async () => {
      try {
        const u = await getStoredUser();
        safeFinish({ user: u, hasPin: false });
      } catch {
        safeFinish({ user: null, hasPin: false });
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      pulseLoop.stop();
    };
  }, []);

  const handleSkipSplash = async () => {
    try {
      const stored = await getStoredUser();
      onFinish({ user: stored, hasPin: false });
    } catch {
      onFinish({ user: null, hasPin: false });
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleSkipSplash}
    >
      <StatusBar style="dark" />

      {/* Modern Ambient Glow Shapes (Mirrors the clean, warm home screen aesthetic) */}
      <View style={styles.ambientBlobTopRight} pointerEvents="none" />
      <View style={styles.ambientBlobBottomLeft} pointerEvents="none" />

      {/* Top Header Badge */}
      <View style={[styles.topSection, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
        <View style={styles.systemBadge}>
          <View style={styles.statusPulseDot} />
          <Text style={styles.systemBadgeText}>
            {language === 'bn' ? 'স্মার্ট ফিনান্সিয়াল সিস্টেম' : 'Student Financial Intelligence'}
          </Text>
        </View>
      </View>

      {/* Center Unified Hero Card */}
      <Animated.View
        style={[
          styles.centerSection,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.heroCard}>
          {/* Logo with gentle pulse */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Image
              source={BRANDING.assets.splashMascot || require('../../assets/logo/file_0000000001588211a3990faca79abdd6.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Unified Taglines */}
          <View style={styles.taglineBlock}>
            <Text style={styles.taglineEn}>{BRANDING.taglineEn}</Text>
            <View style={styles.taglineBnPill}>
              <Text style={styles.taglineBn}>{BRANDING.taglineBn}</Text>
            </View>
          </View>

          {/* Integrated Sleek Loading Track */}
          <View style={styles.loadingBlock}>
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="sparkles" size={12} color="#EA580C" style={{ marginRight: 6 }} />
              <Text style={styles.loadingText}>
                {language === 'bn' ? 'নিরাপদ লেজার লোড হচ্ছে...' : 'Initializing secure ledger...'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Security Trust Badge */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={styles.trustPill}>
          <Ionicons name="shield-checkmark" size={13} color="#10B981" />
          <Text style={styles.trustText}>
            256-Bit Bank Encryption • Hybrid ML v2.0
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  // Ambient background gradients
  ambientBlobTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFEDD5',
    opacity: 0.65,
  },
  ambientBlobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFF7ED',
    opacity: 0.7,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statusPulseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 7,
  },
  systemBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },
  centerSection: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  heroCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  logoWrapper: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  taglineBlock: {
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 20,
  },
  taglineEn: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  taglineBnPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    marginTop: 8,
  },
  taglineBn: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#EA580C',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingBlock: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
  },
  progressBarTrack: {
    width: '100%',
    maxWidth: 240,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    gap: 6,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  trustText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
