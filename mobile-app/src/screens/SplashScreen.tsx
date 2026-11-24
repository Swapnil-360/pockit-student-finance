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
  const t = TRANSLATIONS[language];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
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

    // 1. Smooth entry animations (native driver for opacity & transform)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: useNative,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: useNative,
      }),
    ]).start();

    // 2. Progress bar animation (JS driver for layout width to prevent Invariant Violation on native)
    Animated.timing(progressAnim, {
      toValue: 0.82,
      duration: 750,
      useNativeDriver: false,
    }).start();

    // 3. Subtle gentle breathing pulse for circular brand badge
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
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

    // 5. Safety watchdog timer (guarantees splash never freezes app, but attempts reading stored user first)
    const safetyTimer = setTimeout(async () => {
      try {
        const u = await getStoredUser();
        safeFinish({ user: u, hasPin: false });
      } catch {
        safeFinish({ user: null, hasPin: false });
      }
    }, 3200);

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
      <StatusBar style="light" />

      {/* Modern Engineering Dot Grid Accents */}
      <DotGrid style={styles.gridTopLeft} />
      <DotGrid style={styles.gridTopRight} />

      <Animated.View
        style={[
          styles.contentBox,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Animated Loading Mascot Illustration */}
        <Animated.View
          style={[
            styles.mascotContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image
            source={BRANDING.assets.splashMascot || require('../../assets/logo/file_0000000001588211a3990faca79abdd6.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Clean Bold Typography */}
        <Text style={styles.appTitle}>{BRANDING.appName}</Text>
        <Text style={styles.taglineEn}>{BRANDING.taglineEn}</Text>
        <Text style={styles.taglineBn}>{BRANDING.taglineBn}</Text>
      </Animated.View>

      {/* Sleek Modern Horizontal Loading Bar */}
      <View style={styles.loadingSection}>
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
          {language === 'bn' ? 'নিরাপদ লেজার লোড হচ্ছে...' : 'Initializing secure ledger...'}
        </Text>
      </View>

      {/* Elegant Dark Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pockit • Hybrid ML Risk Engine v2.0.0
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Subtle Decorative Matrix Dot Grid
const DotGrid: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.dotGridContainer, style]}>
    {[0, 1, 2, 3, 4].map((row) => (
      <View key={row} style={styles.dotRow}>
        {[0, 1, 2, 3, 4].map((col) => (
          <View key={col} style={styles.gridDot} />
        ))}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#172330', // Deep dark slate/navy fintech canvas
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  dotGridContainer: {
    position: 'absolute',
    opacity: 0.16,
  },
  gridTopLeft: {
    top: 70,
    left: 28,
  },
  gridTopRight: {
    top: 70,
    right: 28,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#8EA4BA',
  },
  contentBox: {
    alignItems: 'center',
    width: '100%',
    marginTop: -30,
  },
  mascotContainer: {
    width: 250,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 12,
  },
  taglineEn: {
    fontSize: 15,
    lineHeight: 22,
    color: '#BAC8D5',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  taglineBn: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8E9FA9',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  loadingSection: {
    position: 'absolute',
    bottom: 96,
    width: '100%',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: 264,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#243343',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#F47B4E', // Vibrant Warm Terracotta
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#7D90A3',
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
  },
  footerText: {
    color: '#4B5E73',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
