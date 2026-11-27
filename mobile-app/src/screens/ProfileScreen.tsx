import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { GlassCard } from '../components/GlassCard';
import { FeatureWalkthroughModal } from '../components/FeatureWalkthroughModal';
import { MonthlyReportModal } from '../components/MonthlyReportModal';
import {
  getStudentProfile,
  updateUserProfile,
  updateBudgetBaseline,
  uploadUserAvatar,
  submitMonthEndCheckin,
  logoutUser,
  fetchSubscriptionStatus,
  deleteAccountApi,
  fetchStreak,
  fetchStreakLeaderboard,
  submitAppFeedback,
  UserData,
} from '../services/api';
import {
  scheduleDailySpendingReminder,
  cancelDailySpendingReminder,
  getDailyReminderSettings,
  saveDailyReminderSettings,
  sendTestReminderNotification,
} from '../services/notifications';
import {
  AppUpdateInfo,
  checkForGitHubUpdate,
  checkForOtaUpdate,
  applyOtaUpdate,
  openApkDownload,
  getCurrentAppVersion,
} from '../services/appUpdater';
import { supabase } from '../services/supabaseClient';
import { getCallingName, suggestCallingNames } from '../utils/nameHelper';

interface ProfileScreenProps {
  user: UserData;
  language: Language;
  initialStreak?: number;
  onToggleLanguage: () => void;
  onLogout: () => void;
  onOpenProModal: () => void;
  onProfileUpdated?: (updated: Partial<UserData>) => void;
  onClose?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  language,
  initialStreak,
  onToggleLanguage,
  onLogout,
  onOpenProModal,
  onProfileUpdated,
  onClose,
}) => {
  const { isDark, theme, toggleTheme, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<UserData>(user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<{ is_pro: boolean; tier: string; expiry?: string }>({
    is_pro: Boolean(user.is_pro),
    tier: user.is_pro ? 'pro' : 'free',
  });
  const [myStreak, setMyStreak] = useState<number>(initialStreak ?? 0);
  const [myStreakRank, setMyStreakRank] = useState<number | null>(null);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser.full_name);
  const [editCallingName, setEditCallingName] = useState(currentUser.calling_name || getCallingName(currentUser.full_name));
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatar_url || AVATAR_PRESETS[0]);
  const [editUniType, setEditUniType] = useState('Public');
  const [editYear, setEditYear] = useState('2nd year');
  const [editLiving, setEditLiving] = useState('With family');
  const [editAllowance, setEditAllowance] = useState('10000');
  const [editRent, setEditRent] = useState('0');
  const [editMessMeal, setEditMessMeal] = useState('0');
  const [editEnableMessMeals, setEditEnableMessMeals] = useState<boolean>(true);
  const [editAcademicFee, setEditAcademicFee] = useState('0');
  const [editSavings, setEditSavings] = useState('0');
  const [savingProfile, setSavingProfile] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [academicModalVisible, setAcademicModalVisible] = useState(false);

  // Monthly Financial Statement State
  const [monthlyReportVisible, setMonthlyReportVisible] = useState(false);

  // App Preferences State
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(21);
  const [reminderMinute, setReminderMinute] = useState(30);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateResult, setUpdateResult] = useState<AppUpdateInfo | null>(null);
  const [otaAvailable, setOtaAvailable] = useState(false);
  const [applyingOta, setApplyingOta] = useState(false);

  // Account Management State
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Retraining Check-In state
  const [ranOut, setRanOut] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [fbCategory, setFbCategory] = useState<'General' | 'Bug Report' | 'Feature Idea' | 'Smart Coach'>('General');
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbMessage, setFbMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const t = TRANSLATIONS[language];
  const statusBarPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;

  useEffect(() => {
    loadProfile();
    loadSubscription();
    loadStreakStats();
    getDailyReminderSettings().then((s) => {
      setDailyReminderEnabled(s.enabled);
      setReminderHour(s.hour);
      setReminderMinute(s.minute);
    });
  }, [user.id]);

  const formatReminderTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = m < 10 ? `0${m}` : `${m}`;
    return `${hour12}:${minStr} ${period}`;
  };

  const handleCheckForUpdates = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setUpdateModalVisible(true);
    setCheckingUpdates(true);
    try {
      const [gh, hasOta] = await Promise.all([
        checkForGitHubUpdate(),
        checkForOtaUpdate(),
      ]);
      setUpdateResult(gh);
      setOtaAvailable(hasOta);
    } finally {
      setCheckingUpdates(false);
    }
  };

  useEffect(() => {
    if (typeof initialStreak === 'number' && initialStreak > 0) {
      setMyStreak((prev) => Math.max(prev, initialStreak));
    }
  }, [initialStreak]);

  const loadStreakStats = async () => {
    fetchStreak(user.id)
      .then((s) => {
        const resolved = s.current_streak ?? s.on_track_streak ?? initialStreak ?? 0;
        if (resolved > 0) setMyStreak(resolved);
      })
      .catch(() => {});

    fetchStreakLeaderboard(user.id)
      .then((lb) => {
        setMyStreakRank(lb.my_rank ?? null);
        if (lb.my_streak && lb.my_streak > 0) {
          setMyStreak((prev) => Math.max(prev, lb.my_streak));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    setCurrentUser(user);
    setEditFullName(user.full_name);
    setEditCallingName(user.calling_name || getCallingName(user.full_name));
    if (user.avatar_url) {
      setEditAvatarUrl(user.avatar_url);
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getStudentProfile(user.id);
      setProfile(data);
      if (data) {
        setEditUniType(data.university_type || 'Public');
        setEditYear(data.year_of_study || '2nd year');
        setEditLiving(data.where_you_live || 'With family');
        setEditAllowance(String(data.monthly_allowance_fixed ?? 10000));
        setEditRent(String(data.monthly_rent_fixed ?? 0));
        setEditMessMeal(String(data.mess_meal_fixed ?? 0));
        setEditEnableMessMeals(
          data.enable_mess_meals !== undefined && data.enable_mess_meals !== null
            ? Boolean(data.enable_mess_meals)
            : data.where_you_live === 'Mess-hostel'
        );
        setEditAcademicFee(String(data.academic_fee_fixed ?? 0));
        setEditSavings(String(data.target_savings ?? data.savings_goal_fixed ?? 0));
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const status = await fetchSubscriptionStatus(user.id);
      setSubStatus(status);
    } catch {}
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateUserProfile(currentUser.id, {
        fullName: editFullName.trim(),
        callingName: editCallingName.trim() || undefined,
        avatarUrl: editAvatarUrl,
        universityType: editUniType,
        yearOfStudy: editYear,
        whereYouLive: editLiving,
        monthlyAllowanceFixed: parseFloat(editAllowance) || 0,
        monthlyRentFixed: parseFloat(editRent) || 0,
        messMealFixed: parseFloat(editMessMeal) || 0,
        academicFeeFixed: parseFloat(editAcademicFee) || 0,
        targetSavings: parseFloat(editSavings) || 0,
        savingsGoalFixed: parseFloat(editSavings) || 0,
        enableMessMeals: editEnableMessMeals,
      });

      if (res.user) {
        setCurrentUser(res.user);
        if (onProfileUpdated) {
          onProfileUpdated(res.user);
        }
      }
      if (res.profile) {
        setProfile(res.profile);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setEditModalVisible(false);
      Alert.alert(
        language === 'bn' ? 'সফল হয়েছে' : 'Profile Updated',
        language === 'bn' ? 'আপনার তথ্য ডাটাবেজে সংরক্ষিত হয়েছে।' : 'Your profile has been updated on the database.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBudgetBaseline = async () => {
    setSavingProfile(true);
    try {
      const res = await updateBudgetBaseline(currentUser.id, {
        monthlyAllowanceFixed: parseFloat(editAllowance) || 0,
        monthlyRentFixed: parseFloat(editRent) || 0,
        messMealFixed: parseFloat(editMessMeal) || 0,
        academicFeeFixed: parseFloat(editAcademicFee) || 0,
        targetSavings: parseFloat(editSavings) || 0,
        savingsGoalFixed: parseFloat(editSavings) || 0,
        enableMessMeals: editEnableMessMeals,
      });

      if (res?.profile) {
        setProfile(res.profile);
      }
      if (onProfileUpdated) {
        onProfileUpdated(currentUser);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setBudgetModalVisible(false);
      Alert.alert(
        language === 'bn' ? 'বাজেট সংরক্ষিত' : 'Budget Recalibrated',
        language === 'bn'
          ? 'আপনার নতুন আর্থিক সীমা সংরক্ষিত হয়েছে এবং দৈনিক সীমা সমন্বয় করা হয়েছে।'
          : 'Your monthly baseline has been saved and your daily spending limit recalibrated.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update budget baseline');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAcademicProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateUserProfile(currentUser.id, {
        universityType: editUniType,
        yearOfStudy: editYear,
        whereYouLive: editLiving,
        enableMessMeals: editEnableMessMeals,
      });

      if (res?.user) {
        setCurrentUser(res.user);
        if (onProfileUpdated) {
          onProfileUpdated(res.user);
        }
      }
      if (res?.profile) {
        setProfile(res.profile);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setAcademicModalVisible(false);
      Alert.alert(
        language === 'bn' ? 'সফল হয়েছে' : 'Living Setup Updated',
        language === 'bn'
          ? 'আপনার আবাসন ও শিক্ষাগত তথ্য সংরক্ষিত হয়েছে এবং এআই রিস্ক মডেল নতুন করে সমন্বয় করা হয়েছে।'
          : 'Your academic & housing arrangement has been updated on the database and AI risk models recalibrated.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update academic profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required',
          language === 'bn'
            ? 'ছবি আপলোড করতে ফটো লাইব্রেরি অ্যাক্সেস অনুমোদন করুন।'
            : 'Please grant access to your photo library to upload a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let finalAvatarUrl = asset.uri;

        // If base64 is available, upload directly to Supabase Storage via backend
        if (asset.base64) {
          try {
            const cloudUrl = await uploadUserAvatar(
              currentUser.id,
              `data:image/jpeg;base64,${asset.base64}`
            );
            if (cloudUrl) {
              finalAvatarUrl = cloudUrl;
            }
          } catch (uploadErr) {
            console.warn('Supabase storage upload notice, using local URI:', uploadErr);
          }
        }

        setEditAvatarUrl(finalAvatarUrl);
        const updatedUser = { ...currentUser, avatar_url: finalAvatarUrl };
        setCurrentUser(updatedUser);
        if (onProfileUpdated) {
          onProfileUpdated(updatedUser);
        }
        await updateUserProfile(currentUser.id, { avatarUrl: finalAvatarUrl });
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to select image');
    }
  };

  const handleDeleteAccountConfirm = async () => {
    const doDelete = async () => {
      setDeletingAccount(true);
      try {
        await deleteAccountApi(currentUser.id);
        try {
          await supabase.auth.signOut();
        } catch {}
        await logoutUser();
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        onLogout();
      } catch (err: any) {
        Alert.alert(
          language === 'bn' ? 'অ্যাকাউন্ট মোছা সম্ভব হয়নি' : 'Deletion Failed',
          err?.message || 'Could not delete account. Please try again.'
        );
      } finally {
        setDeletingAccount(false);
      }
    };

    const confirmTitle = language === 'bn' ? 'অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলবেন?' : 'Delete Account Permanently?';
    const confirmMsg = language === 'bn'
      ? 'এই কাজটি আপনার শিক্ষার্থী প্রোফাইল, সকল আয়-ব্যয়ের লেনদেন, মাসিক সঞ্চয় লক্ষ্য ও এআই রিস্ক পূর্বাভাস ডাটাবেস থেকে মুছে ফেলবে। এটি আর ফিরিয়ে আনা সম্ভব নয়।'
      : 'This will permanently remove your student baseline, all logged income & expenses, savings goals, and ML risk data from our database. This action cannot be undone.';

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`${confirmTitle}\n\n${confirmMsg}`) : true;
      if (confirmed) {
        await doDelete();
      }
      return;
    }

    Alert.alert(
      confirmTitle,
      confirmMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Delete Permanently',
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  };

  const handleSubmitCheckin = async () => {
    if (ranOut === null) {
      Alert.alert(
        language === 'bn' ? 'নির্বাচন করুন' : 'Selection Required',
        language === 'bn' ? 'দয়া করে হ্যাঁ অথবা না নির্বাচন করুন।' : 'Please choose Yes or No.'
      );
      return;
    }
    setSubmittingCheckin(true);
    try {
      const monthStr = new Date().toISOString().substring(0, 7);
      await submitMonthEndCheckin(user.id, monthStr, ranOut, notes);
      setCheckinDone(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Checkin failed');
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleSignOutConfirm = async () => {
    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch {}
      await logoutUser();
      onLogout();
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(
            language === 'bn' ? 'আপনি কি অ্যাকাউন্ট থেকে লগআউট করতে চান?' : 'Are you sure you want to sign out?'
          )
        : true;
      if (confirmed) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      language === 'bn' ? 'লগআউট নিশ্চিতকরণ' : 'Confirm Sign Out',
      language === 'bn' ? 'আপনি কি অ্যাকাউন্ট থেকে লগআউট করতে চান?' : 'Are you sure you want to sign out?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.signOut,
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const avatarUri = currentUser.avatar_url || AVATAR_PRESETS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 12, paddingBottom: 140 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>{t.tabProfile}</Text>
              <Text style={[styles.screenSub, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'শিক্ষার্থী পরিচিতি ও অ্যাপ সেটিংস' : 'Student identity & app settings'}
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#EAF2F8',
                }}
              >
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 1. User Identity Card with Editable Avatar */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.userRow}>
            {/* Avatar Image with edit badge */}
            <View style={styles.avatarWrap}>
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              <TouchableOpacity
                style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}
                onPress={handlePickImage}
                activeOpacity={0.8}
                accessibilityLabel="Upload Profile Picture"
              >
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.userName, { color: theme.textPrimary }]}>{currentUser.full_name}</Text>
                <View style={[styles.callingNameBadge, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.15)' : '#FDECE4' }]}>
                  <Text style={[styles.callingNameBadgeText, { color: theme.primary }]}>
                    {getCallingName(currentUser.full_name, currentUser.calling_name)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{currentUser.email}</Text>
              {(currentUser.email?.toLowerCase().includes('@gmail.com') || currentUser.email?.toLowerCase().includes('google')) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginBottom: 2 }}>
                  <Ionicons name="logo-google" size={11} color="#EA4335" />
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>
                    {language === 'bn' ? 'গুগল সংযুক্ত অ্যাকাউন্ট' : 'Google Verified Account'}
                  </Text>
                </View>
              )}

              <View style={styles.badgeRow}>
                {subStatus.is_pro ? (
                  <View style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                    <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                    <Text style={styles.proBadgeText}>PRO COACH</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.freeBadge, { backgroundColor: theme.terracottaSoft }]}
                    onPress={onOpenProModal}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.freeBadgeText, { color: theme.primary }]}>
                      {language === 'bn' ? 'ফ্রি প্ল্যান • আপগ্রেড' : 'FREE TIER • UPGRADE'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View
                  style={[
                    styles.freeBadge,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    },
                  ]}
                >
                  <Ionicons name="flame" size={11} color="#EA580C" />
                  <Text style={[styles.freeBadgeText, { color: '#059669' }]}>
                    {myStreak} {language === 'bn' ? 'দিন স্ট্রিক' : 'd Streak'}
                    {myStreakRank ? ` • #${myStreakRank}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.editPill, { borderColor: theme.border }]}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={11} color={theme.primary} />
                  <Text style={[styles.editPillText, { color: theme.primary }]}>
                    {language === 'bn' ? 'এডিট প্রোফাইল' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* 1B. Monthly Budget & Financial Baseline Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 123, 78, 0.15)' }]}>
              <Ionicons name="wallet-outline" size={18} color="#F47B4E" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'মাসিক বাজেট ও আর্থিক হিসাব' : 'Monthly Budget & Baseline'}
              </Text>
              <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'বাধ্যতামূলক খরচ ও দৈনিক ব্যয়ের নিরাপদ সীমা' : 'Fixed living obligations & safe daily limit'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editPill, { borderColor: theme.border, flexShrink: 0 }]}
              onPress={() => setBudgetModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={11} color={theme.primary} />
              <Text style={[styles.editPillText, { color: theme.primary }]}>
                {language === 'bn' ? 'পরিবর্তন' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: theme.surfaceSubtle, padding: 10, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                {language === 'bn' ? 'মোট প্রাপ্ত অর্থ' : 'Total Monthly Funds'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#10B981', marginTop: 2 }}>
                ৳ {(profile?.monthly_allowance_fixed ?? 10000).toLocaleString()}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: theme.surfaceSubtle, padding: 10, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                {language === 'bn' ? 'সিট / মেস ভাড়া' : 'Fixed Rent'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#F43F5E', marginTop: 2 }}>
                ৳ {(profile?.monthly_rent_fixed ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: theme.surfaceSubtle, padding: 10, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                {language === 'bn' ? 'মেস মিল / বাজার' : 'Mess Meal Advance'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#F43F5E', marginTop: 2 }}>
                ৳ {(profile?.mess_meal_fixed ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: theme.surfaceSubtle, padding: 10, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                {language === 'bn' ? 'সেমিস্টার ফি কিস্তি' : 'Semester Fee Reserve'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#38BDF8', marginTop: 2 }}>
                ৳ {(profile?.academic_fee_fixed ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={{ width: '100%', backgroundColor: theme.surfaceSubtle, padding: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {language === 'bn' ? 'সুরক্ষিত মাসিক সঞ্চয়' : 'Protected Target Savings'}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#F59E0B', marginTop: 2 }}>
                  ৳ {(profile?.target_savings ?? profile?.savings_goal_fixed ?? 0).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(244, 123, 78, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexShrink: 0 }}
                onPress={() => setBudgetModalVisible(true)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F47B4E' }}>
                  {language === 'bn' ? 'পরিবর্তন' : 'Recalibrate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>
        {/* 2. Monthly Financial Statement Audit Card */}
        <GlassCard style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.cardHeaderRow}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setMonthlyReportVisible(true);
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE' }]}>
              <Ionicons name="document-text" size={18} color="#0284C7" />
            </View>
            <View style={styles.headerTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'মাসিক আর্থিক বিবরণী' : 'Monthly Financial Statement'}
                </Text>
                <View style={[styles.badgeNew, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeNewText}>AUDIT</Text>
                </View>
              </View>
              <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'মাস শেষ বা শেষ সপ্তাহের সামগ্রিক আয়, ব্যয় ও সঞ্চয় হিসাব'
                  : 'Full income, fixed obligations, variable spend & savings report'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* 3. App Preferences (Consolidated Grouped Card) */}
        <GlassCard style={styles.sectionCard}>
          <Text style={[styles.groupCardHeading, { color: theme.textPrimary }]}>
            {language === 'bn' ? 'অ্যাপ পছন্দ ও সেটিংস' : 'App Preferences'}
          </Text>

          {/* Row 1: Appearance / Theme */}
          <View style={styles.preferenceRow}>
            <View style={[styles.prefIconBox, { backgroundColor: theme.terracottaSoft }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={theme.primary} />
            </View>
            <View style={styles.prefTextCol}>
              <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'থিম ও আবহ' : 'Appearance'}
              </Text>
              <Text style={[styles.prefSub, { color: theme.textSecondary }]}>
                {isDark ? 'Dark Mode (Night Companion)' : 'Light Mode (Scandinavian)'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.prefActionPill, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={13} color={theme.primary} />
              <Text style={[styles.prefActionText, { color: theme.primary }]}>
                {isDark ? 'Dark' : 'Light'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.prefDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.borderSubtle }]} />

          {/* Row 2: Language */}
          <View style={styles.preferenceRow}>
            <View style={[styles.prefIconBox, { backgroundColor: theme.terracottaSoft }]}>
              <Ionicons name="globe-outline" size={16} color={theme.primary} />
            </View>
            <View style={styles.prefTextCol}>
              <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'ভাষা' : 'Language'}
              </Text>
              <Text style={[styles.prefSub, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'বাংলা (Bangla)' : 'English'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.prefActionPill, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
              onPress={onToggleLanguage}
              activeOpacity={0.7}
            >
              <Text style={[styles.prefActionText, { color: theme.primary }]}>
                {language === 'bn' ? 'English' : 'বাংলা'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.prefDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.borderSubtle }]} />

          {/* Row 3: Daily Spending Reminder */}
          <View style={styles.preferenceRow}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setReminderModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.prefIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="notifications" size={16} color="#D97706" />
              </View>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'দৈনিক খরচের রিমাইন্ডার' : 'Daily Spending Reminder'}
                </Text>
                <Text style={[styles.prefSub, { color: theme.textSecondary }]}>
                  {dailyReminderEnabled
                    ? language === 'bn'
                      ? `প্রতিদিন ${formatReminderTime(reminderHour, reminderMinute)} • সময় বদলাতে ট্যাপ করুন`
                      : `Daily at ${formatReminderTime(reminderHour, reminderMinute)} • Tap to set time`
                    : language === 'bn'
                    ? 'বন্ধ আছে • সময় সেট করতে ট্যাপ করুন'
                    : 'Paused • Tap to configure time'}
                </Text>
              </View>
            </TouchableOpacity>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={async (val) => {
                if (val) {
                  const ok = await scheduleDailySpendingReminder(language, reminderHour, reminderMinute);
                  if (!ok && Platform.OS !== 'web') {
                    Alert.alert(
                      language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required',
                      language === 'bn'
                        ? 'দৈনিক রিমাইন্ডার পেতে ফোনের Settings থেকে Pockit-এর Notification অনুমতি চালু করুন।'
                        : 'Please allow Notifications for Pockit in your phone settings to receive daily reminders.'
                    );
                    setDailyReminderEnabled(false);
                    await saveDailyReminderSettings({ enabled: false, hour: reminderHour, minute: reminderMinute });
                    return;
                  }
                  setDailyReminderEnabled(true);
                  await saveDailyReminderSettings({ enabled: true, hour: reminderHour, minute: reminderMinute });
                } else {
                  setDailyReminderEnabled(false);
                  await saveDailyReminderSettings({ enabled: false, hour: reminderHour, minute: reminderMinute });
                  await cancelDailySpendingReminder();
                }
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.borderSubtle }]} />

          {/* Row 4: App Guide & Feature Tour */}
          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setWalkthroughVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.prefIconBox, { backgroundColor: theme.slateBlueTint }]}>
              <Ionicons name="information-circle" size={16} color={theme.slateBlue} />
            </View>
            <View style={styles.prefTextCol}>
              <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'অ্যাপ গাইড ও ফিচার পরিচিতি' : 'App Guide & Feature Tour'}
              </Text>
              <Text style={[styles.prefSub, { color: theme.textSecondary }]}>
                {language === 'bn' ? '৫-কার্ড ইন্টারঅ্যাক্টিভ ওয়াকথ্রু দেখুন' : 'Explore interactive 5-card walkthrough'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.prefDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.borderSubtle }]} />

          {/* Row 5: Check for Updates */}
          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={handleCheckForUpdates}
            activeOpacity={0.7}
          >
            <View style={[styles.prefIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <Ionicons name="cloud-download-outline" size={16} color="#10B981" />
            </View>
            <View style={styles.prefTextCol}>
              <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'অ্যাপ আপডেট চেক করুন' : 'Check for Updates'}
              </Text>
              <Text style={[styles.prefSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? `বর্তমান ভার্সন v${getCurrentAppVersion()} • নতুন আপডেট দেখুন`
                  : `Current version v${getCurrentAppVersion()} • GitHub & OTA`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* 4. Academic & Living Baseline Details */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="school-outline" size={16} color={theme.primary} />
              <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'শিক্ষাগত ও আবাসিক পরিচিতি' : 'Academic & Living Baseline'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editPill, { borderColor: theme.border }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setAcademicModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={11} color={theme.primary} />
              <Text style={[styles.editPillText, { color: theme.primary }]}>
                {language === 'bn' ? 'পরিবর্তন' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileMetaGrid}>
            <TouchableOpacity
              style={[styles.metaItem, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderSubtle }]}
              onPress={() => setAcademicModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{t.universityType}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Text style={[styles.metaVal, { color: theme.textPrimary }]}>
                  {profile?.university_type === 'Private'
                    ? (language === 'bn' ? 'বেসরকারি' : 'Private')
                    : profile?.university_type === 'National University college'
                    ? (language === 'bn' ? 'জাতীয় বিশ্ববিদ্যালয়' : 'National Univ')
                    : (language === 'bn' ? 'পাবলিক' : 'Public')}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={theme.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metaItem, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderSubtle }]}
              onPress={() => setAcademicModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{t.yearOfStudy}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Text style={[styles.metaVal, { color: theme.textPrimary }]}>
                  {profile?.year_of_study === '1st year'
                    ? (language === 'bn' ? '১ম বর্ষ' : '1st year')
                    : profile?.year_of_study === '2nd year'
                    ? (language === 'bn' ? '২য় বর্ষ' : '2nd year')
                    : profile?.year_of_study === '3rd year'
                    ? (language === 'bn' ? '৩য় বর্ষ' : '3rd year')
                    : profile?.year_of_study === '4th year'
                    ? (language === 'bn' ? '৪র্থ বর্ষ' : '4th year')
                    : profile?.year_of_study === 'Masters'
                    ? (language === 'bn' ? 'মাস্টার্স' : 'Masters')
                    : (profile?.year_of_study || (language === 'bn' ? '২য় বর্ষ' : '2nd year'))}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={theme.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metaItem, { borderBottomColor: 'transparent' }]}
              onPress={() => setAcademicModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{t.whereYouLive}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Text style={[styles.metaVal, { color: theme.primary, fontWeight: '800' }]}>
                  {profile?.where_you_live === 'With family' ? (language === 'bn' ? 'পরিবারের সাথে' : 'With family') :
                   profile?.where_you_live === 'Mess-hostel' ? (language === 'bn' ? 'মেস / হোস্টেল' : 'Mess / Hostel') :
                   profile?.where_you_live === 'Rented flat' ? (language === 'bn' ? 'ভাড়া ফ্ল্যাট' : 'Rented flat') :
                   profile?.where_you_live === 'Hall' ? (language === 'bn' ? 'হল' : 'Univ Hall') :
                   (profile?.where_you_live || (language === 'bn' ? 'পরিবারের সাথে' : 'With family'))}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* 8. Month-End AI Calibration Card (Redesigned with Scandinavian polish) */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.checkinHeaderRow}>
            <View style={[styles.mlBadge, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.16)' : 'rgba(244, 123, 78, 0.10)' }]}>
              <Ionicons name="sparkles" size={11} color={theme.primary} />
              <Text style={[styles.mlBadgeText, { color: theme.primary }]}>
                {language === 'bn' ? 'এআই মডেল ক্যালিব্রেশন' : 'AI MODEL CALIBRATION'}
              </Text>
            </View>
            <View style={[styles.cycleBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(70, 107, 133, 0.08)' }]}>
              <Text style={[styles.cycleBadgeText, { color: theme.textSecondary }]}>
                {new Date().toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardHeading, { color: theme.textPrimary, marginTop: 8 }]}>
            {t.monthEndCheckinTitle}
          </Text>
          <Text style={[styles.checkinSub, { color: theme.textSecondary }]}>
            {t.monthEndCheckinSub}
          </Text>

          {checkinDone ? (
            <View style={[styles.doneBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : '#A7F3D0' }]}>
              <View style={[styles.doneIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={20} color={isDark ? '#34D399' : '#059669'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doneTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
                  {language === 'bn' ? 'ক্যালিব্রেশন সংরক্ষিত' : 'Calibration Recorded'}
                </Text>
                <Text style={[styles.doneText, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  {t.checkinSuccess}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.checkinForm}>
              <Text style={[styles.checkinPrompt, { color: theme.textPrimary }]}>
                {t.actualRanOutQuestion}
              </Text>

              {/* High-polish 2-tile interactive selector */}
              <View style={styles.choiceGrid}>
                {/* Choice 1: Ran Short */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: ranOut === true
                        ? (isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2')
                        : theme.surfaceSubtle,
                      borderColor: ranOut === true
                        ? (isDark ? '#F87171' : '#EF4444')
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderSubtle),
                    },
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setRanOut(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceTopRow}>
                    <View
                      style={[
                        styles.choiceIconBadge,
                        {
                          backgroundColor: ranOut === true
                            ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={ranOut === true ? 'alert-circle' : 'alert-circle-outline'}
                        size={18}
                        color={ranOut === true ? '#EF4444' : theme.textSecondary}
                      />
                    </View>
                    <View
                      style={[
                        styles.choiceRadioDot,
                        {
                          borderColor: ranOut === true ? '#EF4444' : theme.textMuted,
                          backgroundColor: ranOut === true ? '#EF4444' : 'transparent',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.choiceTitle,
                      { color: ranOut === true ? '#EF4444' : theme.textPrimary },
                    ]}
                  >
                    {t.actualRanOutYes}
                  </Text>
                  <Text style={[styles.choiceDesc, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'ঘাটতি বা ধার নিতে হয়েছিল' : 'Needed extra funds'}
                  </Text>
                </TouchableOpacity>

                {/* Choice 2: Stayed on Track */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: ranOut === false
                        ? (isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5')
                        : theme.surfaceSubtle,
                      borderColor: ranOut === false
                        ? (isDark ? '#34D399' : '#10B981')
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderSubtle),
                    },
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setRanOut(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceTopRow}>
                    <View
                      style={[
                        styles.choiceIconBadge,
                        {
                          backgroundColor: ranOut === false
                            ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5')
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={ranOut === false ? 'shield-checkmark' : 'shield-checkmark-outline'}
                        size={18}
                        color={ranOut === false ? '#10B981' : theme.textSecondary}
                      />
                    </View>
                    <View
                      style={[
                        styles.choiceRadioDot,
                        {
                          borderColor: ranOut === false ? '#10B981' : theme.textMuted,
                          backgroundColor: ranOut === false ? '#10B981' : 'transparent',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.choiceTitle,
                      { color: ranOut === false ? '#10B981' : theme.textPrimary },
                    ]}
                  >
                    {t.actualRanOutNo}
                  </Text>
                  <Text style={[styles.choiceDesc, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'নির্ধারিত সীমার মধ্যে ছিল' : 'Finished within limits'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Optional Notes Input with refined prefix icon */}
              <View
                style={[
                  styles.noteInputContainer,
                  {
                    backgroundColor: theme.surfaceSubtle,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderSubtle,
                  },
                ]}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={15}
                  color={theme.textMuted}
                  style={styles.notePrefixIcon}
                />
                <TextInput
                  style={[styles.noteInputField, { color: theme.textPrimary }]}
                  placeholder={t.checkinNotesPlaceholder}
                  placeholderTextColor={theme.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Refined Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitCheckinBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: ranOut !== null ? 1 : 0.65,
                  },
                ]}
                onPress={handleSubmitCheckin}
                disabled={submittingCheckin || ranOut === null}
                activeOpacity={0.82}
              >
                {submittingCheckin ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitCheckinBtnText}>{t.submitCheckinBtn}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>

        {/* 9. Send Feedback & Bug Report Card */}
        <GlassCard style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.cardHeaderRow}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setFeedbackModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FFF7ED' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#F47B4E" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'মতামত ও সমস্যা জানান' : 'Send Feedback & Bug Report'}
              </Text>
              <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'অ্যাপের উন্নতি বা সমস্যার কথা সরাসরি আমাদের জানান'
                  : 'Share suggestions, rate Pockit, or report any issue'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* 10. Account Actions & Session Control */}
        <View style={styles.accountActionSection}>
          {/* Sign Out (Sleek Clean Secondary Pill) */}
          <TouchableOpacity
            style={[
              styles.signOutBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(70, 107, 133, 0.20)',
                shadowColor: theme.shadowColor,
              },
            ]}
            onPress={handleSignOutConfirm}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={17} color={isDark ? '#F87171' : '#DC2626'} />
            <Text style={[styles.signOutBtnText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
              {t.signOut}
            </Text>
          </TouchableOpacity>

          {/* Delete Account (Subtle Minimalist Safety Link) */}
          <TouchableOpacity
            style={styles.deleteAccountLink}
            onPress={handleDeleteAccountConfirm}
            disabled={deletingAccount}
            activeOpacity={0.65}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <View style={styles.deleteLinkRow}>
                <Ionicons name="trash-outline" size={13} color={isDark ? 'rgba(239, 68, 68, 0.75)' : '#991B1B'} />
                <Text style={[styles.deleteAccountLinkText, { color: isDark ? 'rgba(239, 68, 68, 0.75)' : '#991B1B' }]}>
                  {language === 'bn' ? 'অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন' : 'Delete Account Permanently'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FEEDBACK MODAL */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 28,
            }}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'অ্যাপ ফিডব্যাক' : 'App Feedback'}
              </Text>
              <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 8 }]}>
              {language === 'bn' ? 'বিষয়' : 'Category'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 14 }}>
              {(['General', 'Bug Report', 'Feature Idea', 'Smart Coach'] as const).map((cat) => {
                const active = fbCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFbCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active ? '#F47B4E' : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'রেটিং' : 'Rating'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFbRating(star)}>
                  <Ionicons
                    name={star <= fbRating ? 'star' : 'star-outline'}
                    size={26}
                    color={star <= fbRating ? '#F59E0B' : theme.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'আপনার বার্তা' : 'Your Message'}
            </Text>
            <TextInput
              style={{
                color: theme.textPrimary,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 96,
                textAlignVertical: 'top',
                paddingTop: 10,
                marginTop: 6,
                fontSize: 14,
              }}
              multiline
              placeholder={language === 'bn' ? 'আপনার মতামত বা সমস্যার বিবরণ লিখুন...' : 'Write your feedback or describe an issue...'}
              placeholderTextColor={theme.textMuted}
              value={fbMessage}
              onChangeText={setFbMessage}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#F47B4E',
                marginTop: 16,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submittingFeedback ? 0.6 : 1,
              }}
              disabled={submittingFeedback}
              onPress={async () => {
                if (!fbMessage.trim()) {
                  Alert.alert('Required', language === 'bn' ? 'অনুগ্রহ করে আপনার বার্তা লিখুন।' : 'Please enter your feedback message.');
                  return;
                }
                setSubmittingFeedback(true);
                try {
                  await submitAppFeedback({
                    user_id: currentUser.id,
                    category: fbCategory,
                    rating: fbRating,
                    message: fbMessage.trim(),
                  });
                  setFbMessage('');
                  setFeedbackModalVisible(false);
                  Alert.alert(
                    language === 'bn' ? 'ধন্যবাদ!' : 'Thank You!',
                    language === 'bn' ? 'আপনার মতামত সফলভাবে পাঠানো হয়েছে।' : 'Your feedback has been submitted and saved.'
                  );
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to submit feedback.');
                } finally {
                  setSubmittingFeedback(false);
                }
              }}
            >
              {submittingFeedback ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                  {language === 'bn' ? 'ফিডব্যাক পাঠান' : 'Submit Feedback'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheetContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'প্রোফাইল সম্পাদন করুন' : 'Edit Profile'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalContent}>
              {/* Upload Custom Photo Button */}
              <TouchableOpacity
                style={[
                  styles.uploadPhotoBtn,
                  {
                    backgroundColor: theme.terracottaSoft,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.uploadPhotoText, { color: theme.primary }]}>
                  {language === 'bn' ? 'ডিভাইস থেকে ছবি আপলোড করুন' : 'Upload Photo from Device'}
                </Text>
              </TouchableOpacity>

              {/* Select Avatar Preset */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {language === 'bn' ? 'অথবা প্রি-সেট থেকে বেছে নিন' : 'Or Select Avatar Preset'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarPresetScroll}>
                {AVATAR_PRESETS.map((preset, idx) => {
                  const isSelected = editAvatarUrl === preset;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.avatarPresetItem,
                        isSelected && [styles.avatarPresetSelected, { borderColor: theme.primary }],
                      ]}
                      onPress={() => setEditAvatarUrl(preset)}
                      activeOpacity={0.75}
                    >
                      <Image source={{ uri: preset }} style={styles.presetImg} />
                      {isSelected && (
                        <View style={[styles.presetCheckDot, { backgroundColor: theme.primary }]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Custom Image URL */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {language === 'bn' ? 'অথবা ছবির ওয়েব লিঙ্ক দিন' : 'Or Custom Image URL'}
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editAvatarUrl}
                onChangeText={setEditAvatarUrl}
                placeholder="https://..."
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />

              {/* Full Name */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {t.nameLabel}
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editFullName}
                onChangeText={(val) => {
                  setEditFullName(val);
                  if (!editCallingName || editCallingName === getCallingName(editFullName)) {
                    setEditCallingName(getCallingName(val));
                  }
                }}
                placeholder={t.namePlaceholder}
                placeholderTextColor={theme.textMuted}
              />

              {/* Preferred Calling Name (ডাকনাম / সম্বোধন) */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'অ্যাপসে পছন্দের ডাকনাম (Calling Name)' : 'Preferred Calling Name / Nickname'}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>
                    {language === 'bn' ? 'হোমে দেখাবে' : 'Used on Home'}
                  </Text>
                </View>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, marginTop: 6 }]}
                  value={editCallingName}
                  onChangeText={setEditCallingName}
                  placeholder={language === 'bn' ? 'যেমন: Swapnil' : 'e.g., Swapnil'}
                  placeholderTextColor={theme.textMuted}
                />

                {/* 1-Tap Calling Name Suggestions */}
                {suggestCallingNames(editFullName).length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 5 }}>
                      {language === 'bn' ? 'বাছাই করুন:' : 'Suggestions from your name:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {suggestCallingNames(editFullName).map((sug) => {
                        const isSelected = editCallingName.trim().toLowerCase() === sug.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={sug}
                            style={[
                              styles.suggestionChip,
                              {
                                backgroundColor: isSelected
                                  ? theme.primary
                                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'),
                                borderColor: isSelected ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => {
                              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                              setEditCallingName(sug);
                            }}
                          >
                            <Text
                              style={[
                                styles.suggestionChipText,
                                { color: isSelected ? '#FFFFFF' : theme.textPrimary },
                              ]}
                            >
                              {sug}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* University Type */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {t.universityType}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'Public', en: 'Public', bn: 'পাবলিক' },
                  { key: 'Private', en: 'Private', bn: 'বেসরকারি' },
                  { key: 'National University college', en: 'National Univ', bn: 'জাতীয় বিশ্ববিদ্যালয়' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.choicePill,
                      { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                      editUniType === item.key && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                    ]}
                    onPress={() => setEditUniType(item.key)}
                  >
                    <Text style={[styles.choicePillText, { color: editUniType === item.key ? '#FFFFFF' : theme.textPrimary }]}>
                      {language === 'bn' ? item.bn : item.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Year of Study */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {t.yearOfStudy}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: '1st year', en: '1st year', bn: '১ম বর্ষ' },
                  { key: '2nd year', en: '2nd year', bn: '২য় বর্ষ' },
                  { key: '3rd year', en: '3rd year', bn: '৩য় বর্ষ' },
                  { key: '4th year', en: '4th year', bn: '৪র্থ বর্ষ' },
                  { key: 'Masters', en: 'Masters', bn: 'মাস্টার্স' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.choicePill,
                      { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                      editYear === item.key && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                    ]}
                    onPress={() => setEditYear(item.key)}
                  >
                    <Text style={[styles.choicePillText, { color: editYear === item.key ? '#FFFFFF' : theme.textPrimary }]}>
                      {language === 'bn' ? item.bn : item.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Where do you live? */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {t.whereYouLive}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'With family', en: 'With Family', bn: 'পরিবার' },
                  { key: 'Mess-hostel', en: 'Mess / Hostel', bn: 'মেস' },
                  { key: 'Rented flat', en: 'Rented Flat', bn: 'ফ্ল্যাট' },
                  { key: 'Hall', en: 'University Hall', bn: 'হল' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.choicePill,
                      { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                      editLiving === item.key && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                    ]}
                    onPress={() => setEditLiving(item.key)}
                  >
                    <Text style={[styles.choicePillText, { color: editLiving === item.key ? '#FFFFFF' : theme.textPrimary }]}>
                      {language === 'bn' ? item.bn : item.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Monthly Allowance Fixed */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {language === 'bn' ? 'মোট প্রাপ্ত অর্থ (মাসিক)' : 'Total Monthly Funds Available'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editAllowance}
                onChangeText={setEditAllowance}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={theme.textMuted}
              />

              {/* Fixed Rent */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {language === 'bn' ? 'সিট / মেস ভাড়া' : 'Fixed Rent / Accommodation'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editRent}
                onChangeText={setEditRent}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />

              {/* Mess Meal Advance */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {language === 'bn' ? 'মেস মিল / বাজার খরচ' : 'Mess Meal Advance / Food Pool'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editMessMeal}
                onChangeText={setEditMessMeal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />

              {/* Academic Semester Fee Reserve */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {language === 'bn' ? 'সেমিস্টার ফি কিস্তি সঞ্চয়' : 'Semester Tuition Fee Reserve'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editAcademicFee}
                onChangeText={setEditAcademicFee}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />

              {/* Monthly Target Savings */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                {t.targetSavingsPill} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={editSavings}
                onChangeText={setEditSavings}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>
                    {language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes to Database'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DEDICATED MONTHLY BUDGET BASELINE MODAL */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheetContainer, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="wallet-outline" size={20} color="#F47B4E" />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'মাসিক বাজেট ও আর্থিক হিসাব' : 'Monthly Budget & Baseline'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBudgetModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: theme.textSecondary, marginBottom: 8 }]}>
              {language === 'bn'
                ? 'আপনার মেস ভাড়া, খাবার খরচ ও সেমিস্টার ফি পরিবর্তন করুন। এটি সাথে সাথে আপনার দৈনিক খরচের নিরাপদ সীমা আপডেট করবে।'
                : 'Update your total funds, fixed rent, mess meals, and semester fees to immediately recalibrate your daily safe limit.'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalContent}>
              {/* 1. Total Monthly Funds */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? '১. মোট প্রাপ্ত অর্থ (মাসিক)' : '1. Total Monthly Funds Available'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }]}
                value={editAllowance}
                onChangeText={setEditAllowance}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, marginBottom: 12 }}>
                {[5000, 8000, 10000, 15000, 20000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: editAllowance === String(amt) ? 'rgba(244, 123, 78, 0.2)' : theme.surfaceSubtle, borderWidth: 1, borderColor: editAllowance === String(amt) ? '#F47B4E' : theme.border }}
                    onPress={() => setEditAllowance(String(amt))}
                  >
                    <Text style={{ fontSize: 12, color: editAllowance === String(amt) ? '#F47B4E' : theme.textPrimary, fontWeight: '700' }}>৳ {amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 2. Fixed Rent */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? '২. সিট / মেস ভাড়া' : '2. Fixed Rent / Accommodation'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }]}
                value={editRent}
                onChangeText={setEditRent}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, marginBottom: 12 }}>
                {[0, 2500, 3500, 5000, 7000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: editRent === String(amt) ? 'rgba(244, 123, 78, 0.2)' : theme.surfaceSubtle, borderWidth: 1, borderColor: editRent === String(amt) ? '#F47B4E' : theme.border }}
                    onPress={() => setEditRent(String(amt))}
                  >
                    <Text style={{ fontSize: 12, color: editRent === String(amt) ? '#F47B4E' : theme.textPrimary, fontWeight: '700' }}>৳ {amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 3. Mess Meal System & Food Pool */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8, padding: 12, borderRadius: 14, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="restaurant-outline" size={16} color={editEnableMessMeals ? '#10B981' : theme.textMuted} />
                    <Text style={[styles.inputLabel, { color: theme.textPrimary, marginBottom: 0 }]}>
                      {language === 'bn' ? 'মেস মিল সিস্টেম' : 'Mess Meal System'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                    {editEnableMessMeals
                      ? (language === 'bn' ? 'চালু (অগ্রিম জমা কাটা হবে)' : 'Active (Ring-fenced deposit)')
                      : (language === 'bn' ? 'বন্ধ (খাবার খরচ দৈনিক খরচে)' : 'Inactive (Food deducted daily)')}
                  </Text>
                </View>
                <Switch
                  value={editEnableMessMeals}
                  onValueChange={(val) => {
                    try { Haptics.selectionAsync(); } catch {}
                    setEditEnableMessMeals(val);
                  }}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>

              {editEnableMessMeals ? (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? '৩. মেস মিল অগ্রিম জমা' : '3. Mess Meal Advance / Food Pool'} (৳)
                  </Text>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }]}
                    value={editMessMeal}
                    onChangeText={setEditMessMeal}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                  />
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, marginBottom: 12 }}>
                    {[0, 3000, 4500, 6000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: editMessMeal === String(amt) ? 'rgba(244, 123, 78, 0.2)' : theme.surfaceSubtle, borderWidth: 1, borderColor: editMessMeal === String(amt) ? '#F47B4E' : theme.border }}
                        onPress={() => setEditMessMeal(String(amt))}
                      >
                        <Text style={{ fontSize: 12, color: editMessMeal === String(amt) ? '#F47B4E' : theme.textPrimary, fontWeight: '700' }}>৳ {amt.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={{ padding: 11, borderRadius: 12, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9', marginBottom: 14 }}>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, lineHeight: 16 }}>
                    {language === 'bn'
                      ? 'মেস মিল বন্ধ থাকলে খাবার খরচ অগ্রিম জমা হিসেবে আলাদা আটকানো হয় না। আপনার খাবারের খরচ স্বাভাবিক দৈনিক খরচ হিসেবে হাতখরচ থেকে হিসাব হবে।'
                      : 'When Mess Meals are OFF, food costs are not ring-fenced upfront. Meals are tracked as normal daily food expenses from your daily pocket money.'}
                  </Text>
                </View>
              )}

              {/* 4. Semester Tuition Fee Allocation */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? '৪. সেমিস্টার ফি কিস্তি সঞ্চয়' : '4. Semester Tuition Fee Reserve'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }]}
                value={editAcademicFee}
                onChangeText={setEditAcademicFee}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, marginBottom: 12 }}>
                {[0, 2000, 4000, 6000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: editAcademicFee === String(amt) ? 'rgba(244, 123, 78, 0.2)' : theme.surfaceSubtle, borderWidth: 1, borderColor: editAcademicFee === String(amt) ? '#F47B4E' : theme.border }}
                    onPress={() => setEditAcademicFee(String(amt))}
                  >
                    <Text style={{ fontSize: 12, color: editAcademicFee === String(amt) ? '#F47B4E' : theme.textPrimary, fontWeight: '700' }}>৳ {amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Target Savings */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? '৫. সুরক্ষিত মাসিক সঞ্চয়ের লক্ষ্য' : '5. Protected Target Savings'} (৳)
              </Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary, fontSize: 18, fontWeight: '700' }]}
                value={editSavings}
                onChangeText={setEditSavings}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6, marginBottom: 14 }}>
                {[0, 500, 1000, 2000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: editSavings === String(amt) ? 'rgba(244, 123, 78, 0.2)' : theme.surfaceSubtle, borderWidth: 1, borderColor: editSavings === String(amt) ? '#F47B4E' : theme.border }}
                    onPress={() => setEditSavings(String(amt))}
                  >
                    <Text style={{ fontSize: 12, color: editSavings === String(amt) ? '#F47B4E' : theme.textPrimary, fontWeight: '700' }}>৳ {amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Live Preview Card */}
              {(() => {
                const total = parseFloat(editAllowance) || 0;
                const rent = parseFloat(editRent) || 0;
                const meal = editEnableMessMeals ? (parseFloat(editMessMeal) || 0) : 0;
                const acad = parseFloat(editAcademicFee) || 0;
                const save = parseFloat(editSavings) || 0;
                const avail = Math.max(0, total - rent - meal - acad - save);
                const now = new Date();
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
                const dailyPaced = Math.round((avail / daysRemaining) * 10) / 10;
                const dailyAvg = Math.round((avail / 30) * 10) / 10;
                return (
                  <View style={{ backgroundColor: 'rgba(244, 123, 78, 0.1)', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(244, 123, 78, 0.35)', marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 }}>
                      {language === 'bn' ? 'লাইভ দৈনিক সীমার পূর্বাভাস' : 'Live Safe Spend Projection'}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      {language === 'bn'
                        ? `(মোট ৳${total.toLocaleString()} − ভাড়া ৳${rent.toLocaleString()}${editEnableMessMeals ? ` − মেস খাবার ৳${meal.toLocaleString()}` : ''} − সেমিস্টার ৳${acad.toLocaleString()} − সঞ্চয় ৳${save.toLocaleString()}) = ৳${avail.toLocaleString()}`
                        : `(Funds ৳${total.toLocaleString()} − Rent ৳${rent.toLocaleString()}${editEnableMessMeals ? ` − Meals ৳${meal.toLocaleString()}` : ''} − Tuition ৳${acad.toLocaleString()} − Savings ৳${save.toLocaleString()}) = ৳${avail.toLocaleString()}`}
                    </Text>
                    <View style={{ marginTop: 8, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="flash" size={16} color="#F47B4E" />
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#F47B4E' }}>
                          {language === 'bn'
                            ? `বাকি ${daysRemaining} দিনের বরাদ্দ: ৳ ${dailyPaced} / দিন`
                            : `Remaining ${daysRemaining} days limit: ৳ ${dailyPaced} / day`}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 22 }}>
                        {language === 'bn'
                          ? `(পুরো ৩০ দিনের স্বাভাবিক হিসাব: ৳ ${dailyAvg} / দিন)`
                          : `(30-day baseline average: ৳ ${dailyAvg} / day)`}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Save & Recalibrate Button */}
              <TouchableOpacity
                style={[styles.saveProfileBtn, { backgroundColor: theme.primary, marginBottom: 20 }]}
                onPress={handleSaveBudgetBaseline}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>
                    {language === 'bn' ? 'বাজেট সংরক্ষণ ও সমন্বয় করুন' : 'Save & Recalibrate Budget'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DEDICATED ACADEMIC & LIVING SITUATION MODAL */}
      <Modal
        visible={academicModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAcademicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheetContainer, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school-outline" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'শিক্ষাগত ও আবাসিক তথ্য' : 'Academic & Living Situation'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAcademicModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textSecondary, marginBottom: 12 }]}>
              {language === 'bn'
                ? 'বাসা পরিবর্তন করে মেস বা ফ্ল্যাটে উঠেছেন? আবাসন তথ্য আপডেট করুন যাতে এআই মডেল আপনার দৈনিক নিরাপদ সীমা ও আর্থিক ঝুঁকি সঠিকভাবে সমন্বয় করতে পারে।'
                : 'Moved to a hostel, mess, or rented flat? Update your living setup here so Pockit can recalibrate your daily safe limit and ML risk model.'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalContent}>
              {/* 1. Where do you live? */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                {t.whereYouLive}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'With family', en: 'With Family', bn: 'পরিবারের সাথে' },
                  { key: 'Mess-hostel', en: 'Mess / Hostel', bn: 'মেস / হোস্টেল' },
                  { key: 'Rented flat', en: 'Rented Flat', bn: 'ভাড়া ফ্ল্যাট' },
                  { key: 'Hall', en: 'University Hall', bn: 'হল' },
                ].map((item) => {
                  const isSelected = editLiving === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.choicePill,
                        { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                        isSelected && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                      ]}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        setEditLiving(item.key);
                        if (item.key === 'Mess-hostel') {
                          setEditEnableMessMeals(true);
                        } else if (item.key === 'Rented flat') {
                          setEditEnableMessMeals(false);
                        } else {
                          setEditEnableMessMeals(false);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.choicePillText, { color: isSelected ? '#FFFFFF' : theme.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>
                        {language === 'bn' ? item.bn : item.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Mess Meal Toggle for Living Arrangement */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="restaurant-outline" size={16} color={editEnableMessMeals ? '#10B981' : theme.textMuted} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>
                      {language === 'bn' ? 'মেস মিল সিস্টেম' : 'Mess Meal System'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, lineHeight: 15 }}>
                    {editLiving === 'Rented flat'
                      ? (language === 'bn'
                          ? 'ভাড়া ফ্ল্যাটে মিল সিস্টেম থাকলে এটি অন করুন। বন্ধ থাকলে খাবার স্বাভাবিক দৈনিক খরচ।'
                          : 'Turn ON if your flat shares meal counts & deposits; keep OFF for normal daily food.')
                      : editLiving === 'Mess-hostel'
                      ? (language === 'bn'
                          ? 'মেস/হোস্টেলে মিল কাউন্ট ও অগ্রিম টাকা ট্র্যাকিংয়ের জন্য চালু রাখুন।'
                          : 'Active for tracking daily meals and advance refund balance.')
                      : (language === 'bn'
                          ? 'মিল কাউন্ট চালু করতে চাইলে অন করুন।'
                          : 'Turn ON if you use a mess meal deposit system.')}
                  </Text>
                </View>
                <Switch
                  value={editEnableMessMeals}
                  onValueChange={(val) => {
                    try { Haptics.selectionAsync(); } catch {}
                    setEditEnableMessMeals(val);
                  }}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>

              {/* Informative helper callout */}
              <View style={[styles.livingNoteCard, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.12)' : '#FDF4F0', borderColor: isDark ? 'rgba(244, 123, 78, 0.3)' : '#FCDCD0', marginTop: 10 }]}>
                <Ionicons name="information-circle-outline" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                <Text style={[styles.livingNoteText, { color: isDark ? '#FED7AA' : '#9A3412' }]}>
                  {editLiving === 'With family'
                    ? (language === 'bn'
                        ? 'পরিবারের সাথে থাকলে সিট ভাড়া ও মেস খাবার সাধারণত ০ টাকা ধরা হয়।'
                        : 'Living with family auto-adjusts fixed rent overhead to ৳0.')
                    : editLiving === 'Mess-hostel'
                    ? (language === 'bn'
                        ? 'মেসে থাকলে সিট ভাড়া ও মেস মিল অগ্রিম যুক্ত হয়। বাজেট সেকশনে ভাড়া সমন্বয় করুন।'
                        : 'Mess/hostel living includes fixed seat rent & meal pool. Update rent in the Budget section.')
                    : editLiving === 'Rented flat'
                    ? (language === 'bn'
                        ? 'ভাড়া ফ্ল্যাটে স্বতন্ত্র ভাড়া ও গ্যাস/বিদ্যুৎ/বাজার খরচ থাকে। ঝুঁকি মডেলে এটি প্রতিফলিত হবে।'
                        : 'Rented flats have individual rent & utility expenses. ML risk models reflect this overhead.')
                    : (language === 'bn'
                        ? 'হল সুবিধায় ভর্তুকিযুক্ত সিট ও ক্যাফেটেরিয়া খাবার থাকে।'
                        : 'University halls have subsidized room rent and campus cafeteria meals.')}
                </Text>
              </View>

              {/* 2. Year of study */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {t.yearOfStudy}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: '1st year', en: '1st year', bn: '১ম বর্ষ' },
                  { key: '2nd year', en: '2nd year', bn: '২য় বর্ষ' },
                  { key: '3rd year', en: '3rd year', bn: '৩য় বর্ষ' },
                  { key: '4th year', en: '4th year', bn: '৪র্থ বর্ষ' },
                  { key: 'Masters', en: 'Masters', bn: 'মাস্টার্স' },
                ].map((item) => {
                  const isSelected = editYear === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.choicePill,
                        { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                        isSelected && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                      ]}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        setEditYear(item.key);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.choicePillText, { color: isSelected ? '#FFFFFF' : theme.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>
                        {language === 'bn' ? item.bn : item.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. University type */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                {t.universityType}
              </Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'Public', en: 'Public University', bn: 'পাবলিক' },
                  { key: 'Private', en: 'Private University', bn: 'প্রাইভেট' },
                  { key: 'National University college', en: 'National Univ', bn: 'জাতীয় বিশ্ববিদ্যালয়' },
                ].map((item) => {
                  const isSelected = editUniType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.choicePill,
                        { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
                        isSelected && [styles.choicePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                      ]}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        setEditUniType(item.key);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.choicePillText, { color: isSelected ? '#FFFFFF' : theme.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>
                        {language === 'bn' ? item.bn : item.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveProfileBtn, { backgroundColor: theme.primary, marginBottom: 20 }]}
                onPress={handleSaveAcademicProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveProfileBtnText}>
                      {language === 'bn' ? 'সংরক্ষণ ও মডেল রিক্যালিব্রেট করুন' : 'Save & Recalibrate AI Model'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MONTHLY FINANCIAL STATEMENT AUDIT MODAL */}
      <MonthlyReportModal
        visible={monthlyReportVisible}
        userId={currentUser.id}
        language={language}
        onClose={() => setMonthlyReportVisible(false)}
      />

      {/* DAILY REMINDER TIME PICKER MODAL */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'রিমাইন্ডারের সময় নির্ধারণ করুন' : 'Set Daily Reminder Time'}
              </Text>
              <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 14 }}>
              {language === 'bn'
                ? 'আপনার সুবিধামতো একটি সময় বেছে নিন। প্রতিদিন ওই সময়ে খরচ লগ করার নোটিফিকেশন যাবে।'
                : 'Choose when you want Pockit to remind you daily to log your expenses.'}
            </Text>

            {/* Quick Presets */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {[
                { label: '8:00 PM', h: 20, m: 0 },
                { label: '9:00 PM', h: 21, m: 0 },
                { label: '9:30 PM', h: 21, m: 30 },
                { label: '10:30 PM', h: 22, m: 30 },
              ].map((p) => {
                const active = reminderHour === p.h && reminderMinute === p.m;
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => {
                      setReminderHour(p.h);
                      setReminderMinute(p.m);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? 'rgba(244, 123, 78, 0.14)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? theme.primary : theme.textSecondary }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Hour & Minute Steppers */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                marginBottom: 16,
              }}
            >
              <View style={{ alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => setReminderHour((h) => (h + 1) % 24)} style={{ padding: 6 }}>
                  <Ionicons name="chevron-up" size={20} color={theme.primary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary }}>
                  {String(reminderHour % 12 === 0 ? 12 : reminderHour % 12).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => setReminderHour((h) => (h + 23) % 24)} style={{ padding: 6 }}>
                  <Ionicons name="chevron-down" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textMuted }}>:</Text>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => setReminderMinute((m) => (m + 5) % 60)} style={{ padding: 6 }}>
                  <Ionicons name="chevron-up" size={20} color={theme.primary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary }}>
                  {String(reminderMinute).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => setReminderMinute((m) => (m + 55) % 60)} style={{ padding: 6 }}>
                  <Ionicons name="chevron-down" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setReminderHour((h) => (h + 12) % 24)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.primary }}>
                  {reminderHour >= 12 ? 'PM' : 'AM'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={async () => {
                  const ok = await sendTestReminderNotification(language);
                  if (!ok) {
                    Alert.alert(
                      language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required',
                      language === 'bn'
                        ? 'নোটিফিকেশন টেস্ট করতে Settings থেকে অনুমতি দিন।'
                        : 'Please enable notifications in your phone settings to test.'
                    );
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.textSecondary }}>
                  {language === 'bn' ? 'টেস্ট করুন' : 'Send Test'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  const ok = await scheduleDailySpendingReminder(language, reminderHour, reminderMinute);
                  if (!ok && Platform.OS !== 'web') {
                    Alert.alert(
                      language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required',
                      language === 'bn'
                        ? 'নোটিফিকেশন চালু করতে ফোনের Settings থেকে অনুমতি দিন।'
                        : 'Please allow Notifications in your phone settings.'
                    );
                    return;
                  }
                  setDailyReminderEnabled(true);
                  await saveDailyReminderSettings({ enabled: true, hour: reminderHour, minute: reminderMinute });
                  setReminderModalVisible(false);
                  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                }}
                style={{
                  flex: 1.4,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>
                  {language === 'bn' ? 'সেভ ও চালু করুন' : 'Save & Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHECK FOR UPDATES MODAL */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'অ্যাপ আপডেট' : 'App Updates'}
              </Text>
              <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {checkingUpdates ? (
              <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {language === 'bn' ? 'GitHub থেকে নতুন ভার্সন চেক করা হচ্ছে...' : 'Checking GitHub Releases for updates...'}
                </Text>
              </View>
            ) : updateResult?.hasUpdate ? (
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Ionicons name="rocket-outline" size={22} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.textPrimary }}>
                      {language === 'bn'
                        ? `নতুন ভার্সন v${updateResult.latestVersion} উপলব্ধ!`
                        : `New Version v${updateResult.latestVersion} Available!`}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      {`Installed: v${updateResult.currentVersion} → Latest: v${updateResult.latestVersion}`}
                    </Text>
                  </View>
                </View>

                {!!updateResult.releaseNotes && (
                  <ScrollView
                    style={{
                      maxHeight: 150,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                      {updateResult.releaseNotes}
                    </Text>
                  </ScrollView>
                )}

                <TouchableOpacity
                  onPress={() => openApkDownload(updateResult.downloadUrl)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: '#10B981',
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                    {language === 'bn' ? 'আপডেট ও APK ডাউনলোড করুন' : 'Update & Download APK'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 18, gap: 10 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: 'rgba(16, 185, 129, 0.14)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>
                  {language === 'bn' ? 'আপনার অ্যাপ আপ-টু-ডেট আছে!' : "You're up to date!"}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
                  {language === 'bn'
                    ? `আপনি Pockit-এর সর্বশেষ ভার্সন (v${updateResult?.currentVersion || getCurrentAppVersion()}) ব্যবহার করছেন।`
                    : `You are running the latest version of Pockit (v${updateResult?.currentVersion || getCurrentAppVersion()}).`}
                </Text>

                {otaAvailable && (
                  <TouchableOpacity
                    disabled={applyingOta}
                    onPress={async () => {
                      setApplyingOta(true);
                      await applyOtaUpdate();
                      setApplyingOta(false);
                    }}
                    style={{
                      marginTop: 6,
                      width: '100%',
                      paddingVertical: 13,
                      borderRadius: 12,
                      backgroundColor: theme.primary,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' }}>
                      {applyingOta
                        ? language === 'bn' ? 'আপডেট প্রয়োগ হচ্ছে...' : 'Applying Patch...'
                        : language === 'bn' ? 'ইনস্ট্যান্ট প্যাচ প্রয়োগ ও রিস্টার্ট করুন' : 'Apply Instant Patch & Restart'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Interactive Feature Walkthrough Guide Modal */}
      <FeatureWalkthroughModal
        visible={walkthroughVisible}
        onClose={() => setWalkthroughVisible(false)}
        language={language}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  screenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  profileCard: {
    marginBottom: 16,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#F27A49',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  editPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Setting Cards
  sectionCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  // Preferences & Statement Styles
  badgeNew: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNewText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  groupCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 12,
  },
  prefIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTextCol: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefSub: {
    fontSize: 11,
    marginTop: 1,
  },
  prefActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  prefActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  prefDivider: {
    height: 1,
  },

  // Academic Meta Overview
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  profileMetaGrid: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Month-End AI Calibration Card (Scandinavian Refined Layout)
  checkinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  mlBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cycleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cycleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkinSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  doneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  doneText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  checkinForm: {
    gap: 12,
  },
  checkinPrompt: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  choiceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  choiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceRadioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  choiceTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  notePrefixIcon: {
    marginTop: 2,
  },
  noteInputField: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 38,
    padding: 0,
  },
  submitCheckinBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCheckinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // Account Session & Danger Zone
  accountActionSection: {
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },
  signOutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deleteAccountLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteAccountLinkText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textDecorationLine: 'underline',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
  },
  editSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  editModalContent: {
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  uploadPhotoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatarPresetScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  avatarPresetItem: {
    position: 'relative',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 28,
    padding: 2,
  },
  avatarPresetSelected: {},
  presetImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  presetCheckDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  choicePillActive: {},
  choicePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveProfileBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  livingNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  livingNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  callingNameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  callingNameBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
