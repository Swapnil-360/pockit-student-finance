import './src/utils/alertPolyfill';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/constants/ThemeContext';
import { TRANSLATIONS, Language } from './src/constants/translations';
import { SplashScreen } from './src/screens/SplashScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingWizard } from './src/screens/OnboardingWizard';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarLedgerScreen } from './src/screens/CalendarLedgerScreen';
import { AiCoachScreen } from './src/screens/AiCoachScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LogExpenseModal } from './src/components/LogExpenseModal';
import { AddIncomeModal } from './src/components/AddIncomeModal';
import { QuickActionModal } from './src/components/QuickActionModal';
import { ProSubscriptionModal } from './src/components/ProSubscriptionModal';
import { AmbientGlowBackground } from './src/components/AmbientGlowBackground';
import { FeatureWalkthroughModal } from './src/components/FeatureWalkthroughModal';
import {
  fetchDashboard,
  getStudentProfile,
  authGoogle,
  UserData,
  DashboardData,
  AuthResponse,
  createEmptyDashboard,
  FALLBACK_DEMO_DASHBOARD,
  STORAGE_KEYS,
} from './src/services/api';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './src/services/supabaseClient';
import { scheduleDailySpendingReminder } from './src/services/notifications';

WebBrowser.maybeCompleteAuthSession();

type TabKey = 'home' | 'ledger' | 'goals' | 'coach' | 'profile';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const [splashActive, setSplashActive] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  // Default language is English as requested; user can toggle to Bengali anytime
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);

  // Global Modal States
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [proModalVisible, setProModalVisible] = useState(false);

  const t = TRANSLATIONS[language];

  // Load Google Fonts on Web (Plus Jakarta Sans, Hind Siliguri, Inter)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'fintech-google-fonts';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Load language preference on launch (default to 'en')
  useEffect(() => {
    (async () => {
      const savedLang = await AsyncStorage.getItem('@student_finance_language');
      if (savedLang === 'en' || savedLang === 'bn') {
        setLanguage(savedLang);
      } else {
        setLanguage('en');
      }
      scheduleDailySpendingReminder(savedLang === 'bn' ? 'bn' : 'en');
    })();
  }, []);

  // Listen for Supabase OAuth redirect callbacks (Real Google Sign-In) on Web & Mobile
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && !user) {
        try {
          WebBrowser.dismissAuthSession();
        } catch {}
        const uEmail = session.user.email;
        if (uEmail) {
          const uName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            uEmail.split('@')[0];
          const uAvatar =
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture;
          try {
            const authRes = await authGoogle(uEmail, uName, uAvatar);
            handleAuthSuccess(authRes);
          } catch (e) {
            console.warn('Supabase OAuth auto-login notice:', e);
          }
        }
      }
    });

    // Deep link redirect listener for mobile app environments (Android & iOS)
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url || !url.includes('auth/callback')) return;
      try {
        try {
          WebBrowser.dismissAuthSession();
        } catch {}
        if (url.includes('access_token=')) {
          const hash = url.split('#')[1] || url.split('?')[1] || '';
          const params: Record<string, string> = {};
          hash.split('&').forEach((part) => {
            const [k, v] = part.split('=');
            if (k && v) params[k] = decodeURIComponent(v);
          });
          if (params.access_token && params.refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            if (data?.session?.user) {
              const uEmail = data.session.user.email || '';
              const uName =
                data.session.user.user_metadata?.full_name ||
                data.session.user.user_metadata?.name ||
                uEmail.split('@')[0];
              const uAvatar =
                data.session.user.user_metadata?.avatar_url ||
                data.session.user.user_metadata?.picture;
              const authRes = await authGoogle(uEmail, uName, uAvatar);
              handleAuthSuccess(authRes);
            }
          }
        } else if (url.includes('code=')) {
          const code = url.split('code=')[1].split('&')[0];
          if (code) {
            const { data } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(code));
            if (data?.session?.user) {
              const uEmail = data.session.user.email || '';
              const uName =
                data.session.user.user_metadata?.full_name ||
                data.session.user.user_metadata?.name ||
                uEmail.split('@')[0];
              const uAvatar =
                data.session.user.user_metadata?.avatar_url ||
                data.session.user.user_metadata?.picture;
              const authRes = await authGoogle(uEmail, uName, uAvatar);
              handleAuthSuccess(authRes);
            }
          }
        }
      } catch (err) {
        console.warn('Mobile deep link handling notice:', err);
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      authListener.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [user]);

  const handleSplashFinish = async (result: {
    user: UserData | null;
    hasPin: boolean;
  }) => {
    try {
      if (result.user) {
        setUser(result.user);
        if (result.hasPin) {
          setIsLocked(true);
        }

        // 1. Immediately check local cache so existing accounts never get forced into Onboarding on Render cold starts
        const cachedOnboarded = await AsyncStorage.getItem(`@student_has_onboarded_${result.user.id}`);
        const cachedProfile = await AsyncStorage.getItem(`@student_profile_${result.user.id}`);
        const cachedDashStr = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CACHE);

        const isKnownOnboarded =
          cachedOnboarded === 'true' ||
          Boolean(cachedProfile) ||
          Boolean(cachedDashStr) ||
          Boolean(result.user.is_demo);

        if (isKnownOnboarded) {
          setHasProfile(true);
          if (cachedDashStr) {
            try {
              setDashboard(JSON.parse(cachedDashStr));
            } catch {}
          }
        }

        // 2. Refresh profile and dashboard asynchronously in background
        try {
          const profile = await getStudentProfile(result.user.id);
          const onboarded = profile !== null || isKnownOnboarded;
          setHasProfile(onboarded);
          if (onboarded) {
            if (profile) {
              await AsyncStorage.setItem(`@student_has_onboarded_${result.user.id}`, 'true');
              await AsyncStorage.setItem(`@student_profile_${result.user.id}`, JSON.stringify(profile));
            }
            const dash = await fetchDashboard(result.user.id);
            if (dash) setDashboard(dash);
          } else {
            setDashboard(null);
          }
        } catch {
          if (!isKnownOnboarded) {
            setHasProfile(false);
            setDashboard(null);
          }
        }
      }

      // Check if user has seen feature walkthrough on first launch
      const seenWalkthrough = await AsyncStorage.getItem('@has_seen_walkthrough');
      if (!seenWalkthrough) {
        setWalkthroughVisible(true);
      }
    } finally {
      setSplashActive(false);
    }
  };

  const handleAuthSuccess = async (authData: AuthResponse) => {
    setUser(authData.user);
    setHasProfile(authData.has_profile);
    if (authData.has_profile) {
      await AsyncStorage.setItem(`@student_has_onboarded_${authData.user.id}`, 'true');
      const dash = await fetchDashboard(authData.user.id);
      setDashboard(dash);
    }
  };

  const handleOnboardingComplete = async () => {
    if (!user) return;
    await AsyncStorage.setItem(`@student_has_onboarded_${user.id}`, 'true');
    setHasProfile(true);
    const dash = await fetchDashboard(user.id);
    setDashboard(dash);
    setActiveTab('home');
  };

  const refreshData = async () => {
    if (!user) return;
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    try {
      const dash = await fetchDashboard(user.id);
      setDashboard(dash);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleLanguage = async () => {
    const nextLang = language === 'en' ? 'bn' : 'en';
    setLanguage(nextLang);
    await AsyncStorage.setItem('@student_finance_language', nextLang);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setHasProfile(false);
    setDashboard(null);
    setIsLocked(false);
    setActiveTab('home');
  };

  const handleTabPress = (tab: TabKey) => {
    if (activeTab !== tab) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setActiveTab(tab);
      if (tab === 'home') {
        refreshData();
      }
    } else if (tab === 'home') {
      // Tap on active Home tab also triggers instant refresh
      refreshData();
    }
  };

  const handleCloseWalkthrough = async () => {
    await AsyncStorage.setItem('@has_seen_walkthrough', 'true');
    setWalkthroughVisible(false);
  };

  // 1. Splash Screen
  if (splashActive) {
    return <SplashScreen language={language} onFinish={handleSplashFinish} />;
  }

  // 2. PIN Lock Screen (if PIN is enabled and user is logged in)
  if (isLocked) {
    return (
      <PinLockScreen
        language={language}
        onUnlockSuccess={() => setIsLocked(false)}
        onSignOutFallback={handleLogout}
      />
    );
  }

  // 3. Not Logged In -> Auth Screen
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.canvas }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AmbientGlowBackground />
        <AuthScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          onAuthSuccess={handleAuthSuccess}
        />
        {/* Interactive Feature Walkthrough Modal (First-Launch Overlay) */}
        <FeatureWalkthroughModal
          visible={walkthroughVisible}
          onClose={handleCloseWalkthrough}
          language={language}
        />
      </View>
    );
  }

  // 4. Logged In but needs Baseline Survey Assessment
  if (!hasProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.canvas }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AmbientGlowBackground />
        <OnboardingWizard
          userId={user.id}
          language={language}
          onToggleLanguage={toggleLanguage}
          onOnboardingComplete={handleOnboardingComplete}
        />
        {/* Interactive Feature Walkthrough Modal (First-Launch Overlay) */}
        <FeatureWalkthroughModal
          visible={walkthroughVisible}
          onClose={handleCloseWalkthrough}
          language={language}
        />
      </View>
    );
  }

  const isPro = Boolean(dashboard?.is_pro || user.is_pro);

  // 5. Main Dashboard View with Scandinavian Floating Bar + Circular Terracotta '+' Action Button
  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AmbientGlowBackground />

      {/* Screen Views */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            user={user}
            dashboard={dashboard || (user.is_demo ? FALLBACK_DEMO_DASHBOARD : createEmptyDashboard(user.id))}
            language={language}
            onRefresh={refreshData}
            refreshing={refreshing}
            onOpenLogModal={() => setLogModalVisible(true)}
            onOpenIncomeModal={() => setIncomeModalVisible(true)}
            onOpenProModal={() => setProModalVisible(true)}
            onNavigateToTransactions={() => setActiveTab('ledger')}
            onNavigateToCoach={() => setActiveTab('coach')}
            onNavigateToGoals={() => setActiveTab('goals')}
            onNavigateToProfile={() => setActiveTab('profile')}
            onToggleLanguage={toggleLanguage}
          />
        )}

        {activeTab === 'ledger' && (
          <CalendarLedgerScreen
            userId={user.id}
            language={language}
            onOpenExpenseModal={() => setLogModalVisible(true)}
            onOpenIncomeModal={() => setIncomeModalVisible(true)}
            onDataChanged={refreshData}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsScreen
            userId={user.id}
            language={language}
            onRefreshParent={refreshData}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'coach' && (
          <AiCoachScreen
            userId={user.id}
            isPro={isPro}
            language={language}
            onOpenProModal={() => setProModalVisible(true)}
            onProStatusChanged={refreshData}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            language={language}
            onToggleLanguage={toggleLanguage}
            onLogout={handleLogout}
            onOpenProModal={() => setProModalVisible(true)}
            onClose={() => {
              setActiveTab('home');
              refreshData();
            }}
            onProfileUpdated={(updated: Partial<UserData>) => {
              setUser({ ...user, ...updated });
              refreshData();
            }}
          />
        )}
      </View>

      {/* Floating Bottom Navigation Bar (4 Scandinavian Tabs + Prominent Center '+' Button) */}
      <View
        style={[
          styles.floatingNavContainer,
          { bottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View
          style={[
            styles.navbarWrapper,
            {
              backgroundColor: theme.surface,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(70, 107, 133, 0.15)',
              shadowColor: theme.shadowColor,
            },
          ]}
        >
          <View style={styles.tabBarInner}>
            {/* Tab 1: Home */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('home')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'home' ? 'home' : 'home-outline'}
                size={22}
                color={activeTab === 'home' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'home' ? theme.primary : theme.textSecondary },
                  activeTab === 'home' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.tabHome}
              </Text>
              {activeTab === 'home' && (
                <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>

            {/* Tab 2: Daily Log */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('ledger')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'ledger' ? 'calendar' : 'calendar-outline'}
                size={22}
                color={activeTab === 'ledger' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'ledger' ? theme.primary : theme.textSecondary },
                  activeTab === 'ledger' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.tabLedger}
              </Text>
              {activeTab === 'ledger' && (
                <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>

            {/* Tab 3: Dream Goals */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('goals')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'goals' ? 'trophy' : 'trophy-outline'}
                size={22}
                color={activeTab === 'goals' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'goals' ? theme.primary : theme.textSecondary },
                  activeTab === 'goals' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.tabGoals}
              </Text>
              {activeTab === 'goals' && (
                <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>

            {/* Tab 4: Smart Coach */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabPress('coach')}
              activeOpacity={0.7}
            >
              <View style={styles.coachIconWrap}>
                <Ionicons
                  name={activeTab === 'coach' ? 'compass' : 'compass-outline'}
                  size={22}
                  color={activeTab === 'coach' ? theme.primary : theme.textSecondary}
                />
                {isPro && <View style={[styles.proMiniBadge, { backgroundColor: theme.primary }]} />}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'coach' ? theme.primary : theme.textSecondary },
                  activeTab === 'coach' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.tabCoach}
              </Text>
              {activeTab === 'coach' && (
                <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>

            {/* Prominent Floating Terracotta '+' Quick Transaction Button */}
            <TouchableOpacity
              style={[styles.floatingPlusBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                setQuickModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 5-Second Quick Action Modal (+ Add Income / - Add Expense) */}
      <QuickActionModal
        visible={quickModalVisible}
        onClose={() => setQuickModalVisible(false)}
        onOpenIncome={() => setIncomeModalVisible(true)}
        onOpenExpense={() => setLogModalVisible(true)}
        language={language}
      />

      {/* Global Log Expense Modal */}
      <LogExpenseModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        userId={user.id}
        language={language}
        onExpenseAdded={refreshData}
      />

      {/* Global Add Income Modal */}
      <AddIncomeModal
        visible={incomeModalVisible}
        onClose={() => setIncomeModalVisible(false)}
        userId={user.id}
        language={language}
        onIncomeAdded={refreshData}
      />

      {/* Global Pro Subscription Modal */}
      <ProSubscriptionModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        userId={user.id}
        language={language}
        onSubscribed={refreshData}
      />

      {/* Interactive Feature Walkthrough Guide Modal (First-Launch Overlay) */}
      <FeatureWalkthroughModal
        visible={walkthroughVisible}
        onClose={handleCloseWalkthrough}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  floatingNavContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  navbarWrapper: {
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    paddingHorizontal: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingRight: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    position: 'relative',
    paddingHorizontal: 1,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  coachIconWrap: {
    position: 'relative',
  },
  proMiniBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  floatingPlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#F27A49',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
