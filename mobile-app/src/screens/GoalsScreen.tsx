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
import { fetchSavingsGoals, toggleGoalPause, deleteSavingsGoal, SavingsGoal } from '../services/api';
import { SavingsGoalCard } from '../components/SavingsGoalCard';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { BoostGoalModal } from '../components/BoostGoalModal';
import { LeftoverSweepModal } from '../components/LeftoverSweepModal';

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

  const totalSavedAllGoals = goals.reduce((acc, g) => acc + (g.current_saved || 0), 0);
  const totalTargetAllGoals = goals.reduce((acc, g) => acc + (g.target_amount || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D1624' : '#EEF3F7' }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 10,
            backgroundColor: isDark ? 'rgba(13, 22, 36, 0.9)' : 'rgba(238, 243, 247, 0.9)',
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
        {/* Total Vault Stats Card */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? 'rgba(23, 37, 56, 0.7)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
              shadowColor: isDark ? '#000000' : '#466B85',
            },
          ]}
        >
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'মোট সংরক্ষিত সঞ্চয়' : 'Total Vault Savings'}
              </Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                ৳{Math.round(totalSavedAllGoals).toLocaleString()}
              </Text>
            </View>

            <View style={[styles.vaultIconCircle, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.15)' : '#FDF0EC' }]}>
              <Ionicons name="shield-checkmark" size={28} color={theme.primaryAccent} />
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#EAF2F8' }]} />

          <View style={styles.subStatsRow}>
            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'চলমান লক্ষ্য' : 'Active Goals'}
              </Text>
              <Text style={[styles.subStatValue, { color: theme.slateBlue }]}>
                {goals.length}
              </Text>
            </View>

            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'সুরক্ষিত মাসিক চুক্তি' : 'Monthly Protected'}
              </Text>
              <Text style={[styles.subStatValue, { color: theme.primaryAccent }]}>
                ৳{Math.round(activeGoal?.monthly_commitment || 0)}
              </Text>
            </View>

            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'সমাপ্তির অনুপাত' : 'Overall Pace'}
              </Text>
              <Text style={[styles.subStatValue, { color: '#10B981' }]}>
                {totalTargetAllGoals > 0
                  ? `${Math.round((totalSavedAllGoals / totalTargetAllGoals) * 100)}%`
                  : '0%'}
              </Text>
            </View>
          </View>
        </View>

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
              const categoryIcon =
                g.category?.toLowerCase().includes('gadget') || g.title.toLowerCase().includes('monitor')
                  ? 'laptop-outline'
                  : g.category?.toLowerCase().includes('travel') || g.title.toLowerCase().includes('trip')
                  ? 'airplane-outline'
                  : g.category?.toLowerCase().includes('education') || g.title.toLowerCase().includes('course')
                  ? 'school-outline'
                  : 'sparkles-outline';

              return (
                <View
                  key={g.id}
                  style={[
                    styles.otherGoalCard,
                    {
                      backgroundColor: isDark ? 'rgba(23, 37, 56, 0.7)' : '#FFFFFF',
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
                      onPress={() => handleOpenBoost(g)}
                      style={[styles.miniBoostBtn, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.18)' : '#FDF0EC' }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="flash-outline" size={13} color={theme.primaryAccent} />
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

        {/* Milestone Walkthrough */}
        {activeGoal && (
          <View
            style={[
              styles.milestoneCard,
              {
                backgroundColor: isDark ? 'rgba(23, 37, 56, 0.7)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
                shadowColor: isDark ? '#000000' : '#466B85',
              },
            ]}
          >
            <Text style={[styles.milestoneTitle, { color: theme.textPrimary }]}>
              {language === 'bn' ? 'অগ্রগতির ধাপসমূহ' : 'Goal Milestones'}
            </Text>

            <View style={styles.milestoneSteps}>
              {[25, 50, 75, 100].map((pct) => {
                const reached = (activeGoal.progress_pct || 0) >= pct;
                return (
                  <View key={pct} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: reached
                            ? '#10B981'
                            : isDark ? 'rgba(255, 255, 255, 0.15)' : '#D5E4EF',
                        },
                      ]}
                    >
                      {reached ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.stepDotText, { color: theme.textSecondary }]}>
                          {pct}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabel, { color: reached ? theme.textPrimary : theme.textSecondary }]}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
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
  statsCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  vaultIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    height: 1,
    marginVertical: 14,
  },
  subStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subStatItem: {
    alignItems: 'flex-start',
  },
  subStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  subStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  milestoneCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  milestoneSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
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

