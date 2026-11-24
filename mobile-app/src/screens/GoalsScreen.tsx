import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { fetchSavingsGoals, toggleGoalPause, boostSavingsGoal, deleteSavingsGoal, SavingsGoal } from '../services/api';
import { SavingsGoalCard } from '../components/SavingsGoalCard';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { BoostGoalModal } from '../components/BoostGoalModal';
import { LeftoverSweepModal } from '../components/LeftoverSweepModal';
import { getGoalIconName } from '../constants/goalIcons';

interface GoalsScreenProps {
  userId: string;
  language: Language;
  onRefreshParent?: () => void;
  refreshTrigger?: number;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({
  userId,
  language,
  onRefreshParent,
  refreshTrigger,
}) => {
  const { isDark, theme } = useTheme();
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [boostModalVisible, setBoostModalVisible] = useState(false);
  const [sweepModalVisible, setSweepModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const data = await fetchSavingsGoals(userId);
      setGoals(data);
      if (data.length > 0 && !selectedGoal) {
        setSelectedGoal(data[0]);
      }
    } catch (e) {
      console.warn('Failed to load goals:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
    if (onRefreshParent) onRefreshParent();
  };

  const activeGoal = goals.length > 0 ? goals[0] : null;

  const handleTogglePause = async (goal: SavingsGoal) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await toggleGoalPause(goal.id, userId);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (onRefreshParent) onRefreshParent();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle pause');
    }
  };

  const handleOpenBoost = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setBoostModalVisible(true);
  };

  const handleOpenSweep = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setSweepModalVisible(true);
  };

  const handleSaveMonth = async (goal: SavingsGoal, amount: number) => {
    Alert.alert(
      language === 'bn' ? 'মাসিক সঞ্চয় নিশ্চিতকরণ' : 'Save for this Month?',
      language === 'bn'
        ? `"${goal.title}" লক্ষ্যের জন্য চলতি মাসের ৳${amount.toLocaleString()} জমা করতে চান? এটি সাথে সাথে আপনার প্রগ্রেস বারে যুক্ত হবে।`
        : `Save ৳${amount.toLocaleString()} for "${goal.title}" this month? This will be added to your goal progress bar.`,
      [
        { text: language === 'bn' ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: language === 'bn' ? 'জমা দিন' : 'Save Now',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const updated = await boostSavingsGoal(goal.id, userId, amount);
              handleGoalUpdated(updated);
              Alert.alert(
                language === 'bn' ? 'সফল!' : 'Saved for Target! 🎉',
                language === 'bn'
                  ? `৳${amount.toLocaleString()} সফলভাবে জমা হয়েছে এবং প্রগ্রেস বার আপডেট হয়েছে!`
                  : `৳${amount.toLocaleString()} has been added to your goal! Your progress bar is updated.`
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to save for month');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      language === 'bn' ? 'লক্ষ্য মুছে ফেলবেন?' : 'Delete Savings Goal?',
      language === 'bn'
        ? `আপনি কি নিশ্চিত যে "${goal.title}" লক্ষ্যটি মুছে ফেলতে চান? আপনার মাসিক সঞ্চয় ও দৈনিক সীমার হিসাব স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।`
        : `Are you sure you want to delete "${goal.title}"? Your monthly savings and daily limits will be recalibrated.`,
      [
        { text: language === 'bn' ? 'না' : 'Cancel', style: 'cancel' },
        {
          text: language === 'bn' ? 'মুছে ফেলুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteSavingsGoal(goal.id, userId);
              setGoals((prev) => prev.filter((g) => g.id !== goal.id));
              if (selectedGoal?.id === goal.id) {
                const remaining = goals.filter((g) => g.id !== goal.id);
                setSelectedGoal(remaining.length > 0 ? remaining[0] : null);
              }
              if (onRefreshParent) onRefreshParent();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const handleGoalUpdated = (updated: SavingsGoal) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === updated.id);
      if (exists) {
        return prev.map((g) => (g.id === updated.id ? updated : g));
      }
      return [updated, ...prev];
    });
    setSelectedGoal(updated);
    if (onRefreshParent) onRefreshParent();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121417' : '#EEF3F7' }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 10,
            backgroundColor: isDark ? 'rgba(18, 20, 23, 0.95)' : 'rgba(238, 243, 247, 0.9)',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {language === 'bn' ? 'স্বপ্নের সঞ্চয় ভল্ট' : 'Dream Goal Vault'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {language === 'bn'
              ? 'নির্ধারিত লক্ষ্য ও মাসিক সঞ্চয় ট্র্যাকিং'
              : 'Target savings ring-fenced from impulse spend'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerAddBtn, { backgroundColor: theme.primaryAccent }]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setCreateModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primaryAccent} />
        }
      >
        {/* Section Title */}
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
          {language === 'bn' ? 'আপনার মূল লক্ষ্য' : 'Your Primary Goal'}
        </Text>

        {/* Primary Goal Card */}
        <SavingsGoalCard
          goal={activeGoal}
          language={language}
          onOpenBoost={handleOpenBoost}
          onTogglePause={handleTogglePause}
          onSaveMonth={handleSaveMonth}
          onCreateGoal={() => setCreateModalVisible(true)}
          onOpenSweep={handleOpenSweep}
          onDeleteGoal={handleDeleteGoal}
          leftoverSweepAmount={350}
        />

        {/* Other Goals Section (Image 3 Style) */}
        {goals.length > 1 && (
          <View style={styles.otherGoalsSection}>
            <View style={styles.otherGoalsHeader}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginBottom: 0 }]}>
                {language === 'bn' ? 'অন্যান্য লক্ষ্যসমূহ' : 'Other Goals'}
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: theme.primaryAccent }]}>
                  {language === 'bn' ? '+ নতুন যোগ করুন' : '+ Add New'}
                </Text>
              </TouchableOpacity>
            </View>

            {goals.slice(1).map((g) => {
              const gPct = Math.min(100, Math.max(0, g.progress_pct || 0));
              const categoryIcon = getGoalIconName(g.title, g.category);

              return (
                <View
                  key={g.id}
                  style={[
                    styles.otherGoalCard,
                    {
                      backgroundColor: isDark ? '#1A1D21' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
                      shadowColor: isDark ? '#000000' : '#466B85',
                    },
                  ]}
                >
                  <View style={styles.otherGoalLeft}>
                    <View
                      style={[
                        styles.otherGoalIconBox,
                        { backgroundColor: isDark ? 'rgba(83, 122, 150, 0.2)' : '#EAF2F8' },
                      ]}
                    >
                      <Ionicons name={categoryIcon as any} size={20} color={theme.slateBlue} />
                    </View>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.otherGoalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={[styles.otherGoalNumbers, { color: theme.textSecondary }]}>
                        ৳{Math.round(g.current_saved).toLocaleString()} / ৳{Math.round(g.target_amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.otherGoalRight}>
                    <Text style={[styles.otherGoalPct, { color: theme.primaryAccent }]}>
                      {gPct.toFixed(0)}%
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleSaveMonth(g, Math.round(g.monthly_commitment || 500))}
                      style={[styles.miniBoostBtn, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.18)' : '#FDF0EC' }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="wallet-outline" size={13} color={theme.primaryAccent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteGoal(g)}
                      style={[styles.miniDeleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={13} color={isDark ? '#F87171' : '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Educational Student Note */}
        <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(83, 122, 150, 0.18)' : '#EAF2F8' }]}>
          <Ionicons name="bulb-outline" size={20} color={theme.slateBlue} style={{ marginRight: 10 }} />
          <Text style={[styles.tipText, { color: theme.textPrimary }]}>
            {language === 'bn'
              ? 'টাকাট্র্যাক ভল্টে রাখা মাসিক সঞ্চয় আপনার দৈনিক খরচের নিরাপদ সীমা (Safe Daily Limit) থেকে আগেভাগেই আলাদা করে রাখা হয়, যাতে মাস শেষে টাকার টানাটানি হলেও আপনার লক্ষ্য সুরক্ষিত থাকে।'
              : 'Goal Vault savings are ring-fenced from your Safe Daily Limit automatically at the start of each month, safeguarding your dream purchase even if unexpected daily expenses arise.'}
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <CreateGoalModal
        visible={createModalVisible}
        userId={userId}
        language={language}
        onClose={() => setCreateModalVisible(false)}
        onGoalCreated={handleGoalUpdated}
      />

      <BoostGoalModal
        visible={boostModalVisible}
        goal={selectedGoal}
        userId={userId}
        language={language}
        onClose={() => setBoostModalVisible(false)}
        onGoalBoosted={handleGoalUpdated}
      />

      <LeftoverSweepModal
        visible={sweepModalVisible}
        goal={selectedGoal}
        userId={userId}
        sweepAmount={350}
        language={language}
        onClose={() => setSweepModalVisible(false)}
        onSwept={handleGoalUpdated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  otherGoalsSection: {
    marginTop: 18,
    marginBottom: 16,
  },
  otherGoalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  otherGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  otherGoalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  otherGoalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  otherGoalTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  otherGoalNumbers: {
    fontSize: 12,
    fontWeight: '500',
  },
  otherGoalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otherGoalPct: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  miniBoostBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

