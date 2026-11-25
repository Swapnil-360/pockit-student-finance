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

      {/* Subtle Warm Ambient Aura */}
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowBottom} pointerEvents="none" />

      {/* Center Brand Hero Lockup */}
      <Animated.View
        style={[
          styles.centerSection,
          {
            paddingTop: Math.max(insets.top, 24),
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image
            source={BRANDING.assets.headerLogo}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.accentDivider} />

        <View style={styles.taglineBlock}>
          <Text style={styles.taglineEn}>{BRANDING.taglineEn}</Text>
          <Text style={styles.taglineBn}>{BRANDING.taglineBn}</Text>
        </View>
      </Animated.View>

      {/* Sleek Loading & Student Financial Footer */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
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
          <Text style={styles.loadingText}>
            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
          </Text>
        </View>

        <View style={styles.brandFooterRow}>
          <View style={styles.brandFooterDot} />
          <Text style={styles.brandFooterText}>
            {language === 'bn' ? 'স্টুডেন্ট ফিনান্সিয়াল' : 'STUDENT FINANCIAL'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(244, 123, 78, 0.06)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(90, 130, 150, 0.05)',
  },
  centerSection: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 232,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  accentDivider: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F47B4E',
    opacity: 0.8,
    marginTop: 22,
    marginBottom: 18,
  },
  taglineBlock: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  taglineEn: {
    fontSize: 15.5,
    lineHeight: 22,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  taglineBn: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  loadingBlock: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: 196,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F47B4E',
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 10,
  },
  brandFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  brandFooterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F47B4E',
    opacity: 0.85,
  },
  brandFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});
