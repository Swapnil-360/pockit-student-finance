import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { SavingsGoal } from '../services/api';

interface SavingsGoalCardProps {
  goal?: SavingsGoal | null;
  language: Language;
  onOpenBoost: (goal: SavingsGoal) => void;
  onTogglePause: (goal: SavingsGoal) => void;
  onCreateGoal: () => void;
  onOpenSweep?: (goal: SavingsGoal) => void;
  onDeleteGoal?: (goal: SavingsGoal) => void;
  leftoverSweepAmount?: number;
  style?: any;
}

export const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({
  goal,
  language,
  onOpenBoost,
  onTogglePause,
  onCreateGoal,
  onOpenSweep,
  onDeleteGoal,
  leftoverSweepAmount = 0,
  style,
}) => {
  const { isDark, theme } = useTheme();
  const t = TRANSLATIONS[language];

  if (!goal) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(23, 37, 56, 0.7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
            shadowColor: isDark ? '#000000' : '#466B85',
          },
          style,
        ]}
      >
        <View style={styles.emptyContent}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.15)' : '#FDF0EC' }]}>
            <Ionicons name="flag-outline" size={24} color={theme.primaryAccent} />
          </View>
          <View style={styles.emptyTextContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {language === 'bn' ? 'প্রথম সঞ্চয় লক্ষ্য নির্ধারণ' : 'Set Your Primary Goal'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {language === 'bn'
                ? 'ল্যাপটপ, মনিটর বা কোর্সের জন্য মাসিক সঞ্চয় সুরক্ষিত রাখুন।'
                : 'Ring-fence monthly savings for gadgets, books, or a trip.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.primaryAccent }]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            onCreateGoal();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.createBtnText}>
            {language === 'bn' ? 'নতুন লক্ষ্য নির্ধারণ' : 'Set a Dream Goal'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = Math.min(100, Math.max(0, goal.progress_pct || 0));
  const completionDate = language === 'bn' ? goal.target_completion_date_bn || goal.target_completion_date : goal.target_completion_date;
  const shiftNote = language === 'bn' ? goal.timeline_shift_note_bn : goal.timeline_shift_note_en;
  const isTimelineMode = goal.planning_mode === 'target_timeline';
  const requiredMonthly = goal.required_monthly_savings || goal.monthly_commitment || 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(23, 37, 56, 0.7)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
          shadowColor: isDark ? '#000000' : '#466B85',
        },
        style,
      ]}
    >
      {/* Top Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'চলমান স্বপ্ন লক্ষ্য' : 'Dream Goal'}
              </Text>
              {/* Planning Mode Pill Badge */}
              <View
                style={[
                  styles.modeBadge,
                  {
                    backgroundColor: isTimelineMode
                      ? isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5'
                      : isDark ? 'rgba(224, 122, 95, 0.18)' : '#FFF4F0',
                    borderColor: isTimelineMode
                      ? isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0'
                      : isDark ? 'rgba(224, 122, 95, 0.3)' : '#FCDCD2',
                  },
                ]}
              >
                <Ionicons
                  name={isTimelineMode ? 'time-outline' : 'wallet-outline'}
                  size={10}
                  color={isTimelineMode ? '#10B981' : theme.primaryAccent}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.modeBadgeText,
                    { color: isTimelineMode ? '#10B981' : theme.primaryAccent },
                  ]}
                >
                  {isTimelineMode
                    ? language === 'bn' ? 'নির্ধারিত সময়' : 'Target Timeline'
                    : language === 'bn' ? 'মাসিক বাজেট' : 'Monthly Budget'}
                </Text>
              </View>
            </View>

            <Text style={[styles.goalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {goal.title}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(83, 122, 150, 0.25)' : '#EAF2F8' }]}>
            <Text style={[styles.categoryText, { color: theme.slateBlue }]}>
              {goal.category || 'Gadget'}
            </Text>
          </View>
          {onDeleteGoal && (
            <TouchableOpacity
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                onDeleteGoal(goal);
              }}
              style={[
                styles.deleteGoalBtn,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Delete goal"
            >
              <Ionicons name="trash-outline" size={15} color={isDark ? '#F87171' : '#EF4444'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress & Numbers */}
      <View style={styles.progressSection}>
        <View style={styles.numbersRow}>
          <Text style={[styles.savedAmount, { color: theme.textPrimary }]}>
            ৳{Math.round(goal.current_saved).toLocaleString()}
            <Text style={[styles.targetAmount, { color: theme.textSecondary }]}>
              {' '}/ ৳{Math.round(goal.target_amount).toLocaleString()}
            </Text>
          </Text>
          <Text style={[styles.percentBadge, { color: theme.primaryAccent }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>

        {/* Progress Bar Track */}
        <View style={[styles.trackBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2ECF3' }]}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress}%`,
                backgroundColor: goal.is_paused ? theme.warningOrange : theme.primaryAccent,
              },
            ]}
          />
        </View>
      </View>

      {/* Target Timeline & Commitment Breakdown (Mode-Aware) */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {isTimelineMode
              ? (language === 'bn' ? 'নির্দিষ্ট সময়: ' : 'Deadline: ')
              : (language === 'bn' ? 'সম্ভাব্য: ' : 'Target: ')}
            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{completionDate}</Text>
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons
            name={isTimelineMode ? 'flash-outline' : 'wallet-outline'}
            size={14}
            color={isTimelineMode ? '#10B981' : theme.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.metaText, { color: isTimelineMode ? '#10B981' : theme.textSecondary, fontWeight: isTimelineMode ? '700' : '600' }]}>
            ৳{Math.round(isTimelineMode ? requiredMonthly : goal.monthly_commitment).toLocaleString()}
            <Text style={{ fontSize: 10, fontWeight: '500' }}>
              {isTimelineMode
                ? (language === 'bn' ? '/মাস প্রয়োজন' : '/mo needed')
                : (language === 'bn' ? '/মাস' : '/mo')}
            </Text>
          </Text>
        </View>
      </View>

      {/* Dynamic Mode / Shift / Boost Notice */}
      {shiftNote ? (
        <View
          style={[
            styles.pauseBanner,
            {
              backgroundColor: goal.is_paused
                ? (isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3')
                : (isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF'),
              borderColor: goal.is_paused
                ? (isDark ? 'rgba(234, 179, 8, 0.3)' : '#FDE047')
                : (isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD'),
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons
            name={goal.is_paused ? 'time-outline' : 'information-circle-outline'}
            size={14}
            color={goal.is_paused ? '#CA8A04' : '#0284C7'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.pauseText,
              { color: goal.is_paused ? (isDark ? '#FDE047' : '#854D0E') : (isDark ? '#BAE6FD' : '#0369A1') },
            ]}
          >
            {shiftNote}
          </Text>
        </View>
      ) : null}

      {/* Leftover Sweep Callout (If unspent funds available) */}
      {leftoverSweepAmount > 50 && onOpenSweep && (
        <TouchableOpacity
          style={[styles.sweepBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            onOpenSweep(goal);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Ionicons name="arrow-up" size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.sweepBannerText, { color: isDark ? '#6EE7B7' : '#065F46' }]} numberOfLines={1}>
              {language === 'bn'
                ? `৳${Math.round(leftoverSweepAmount)} বাড়তি জমা দিন`
                : `Sweep ৳${Math.round(leftoverSweepAmount)} unspent funds`}
            </Text>
          </View>
          <View style={styles.sweepActionBadge}>
            <Text style={styles.sweepActionBadgeText}>
              {language === 'bn' ? 'জমা' : 'Sweep'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.boostBtn, { backgroundColor: theme.primaryAccent }]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
            onOpenBoost(goal);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="trending-up-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.boostBtnText}>
            {language === 'bn' ? 'বুস্ট' : 'Boost'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.pauseBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F4F8',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(83, 122, 150, 0.2)',
            },
          ]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            onTogglePause(goal);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={goal.is_paused ? 'play-outline' : 'pause-outline'}
            size={16}
            color={goal.is_paused ? theme.primaryAccent : theme.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.pauseBtnText,
              { color: goal.is_paused ? theme.primaryAccent : theme.textSecondary },
            ]}
          >
            {goal.is_paused
              ? language === 'bn' ? 'চালু করুন' : 'Resume'
              : language === 'bn' ? 'বিরতি' : 'Pause Month'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  createBtn: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 10,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savedAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  targetAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  percentBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  trackBg: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  pauseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  pauseText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  sweepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  sweepBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sweepActionBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sweepActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  boostBtn: {},
  boostBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pauseBtn: {
    borderWidth: 1,
  },
  pauseBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteGoalBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

