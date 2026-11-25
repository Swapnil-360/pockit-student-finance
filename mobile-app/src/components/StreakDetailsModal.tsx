import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';
import {
  StreakSummary,
  StreakLeaderboardResponse,
  fetchStreakLeaderboard,
  applyForStreakOffer,
} from '../services/api';

interface StreakDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  language: Language;
  streakSummary: StreakSummary;
}

export const StreakDetailsModal: React.FC<StreakDetailsModalProps> = ({
  visible,
  onClose,
  language,
  streakSummary,
}) => {
  const { isDark, theme } = useTheme();
  const isBn = language === 'bn';

  const [lbData, setLbData] = useState<StreakLeaderboardResponse | null>(null);
  const [loadingLb, setLoadingLb] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && streakSummary.user_id) {
      setLoadingLb(true);
      fetchStreakLeaderboard(streakSummary.user_id)
        .then((res) => setLbData(res))
        .finally(() => setLoadingLb(false));
    }
  }, [visible, streakSummary.user_id]);

  const handleApplyOffer = async (offerId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setApplyingId(offerId);
    try {
      const app = await applyForStreakOffer(streakSummary.user_id, offerId);
      setLbData((prev) =>
        prev
          ? { ...prev, applications: [app, ...(prev.applications || [])] }
          : prev
      );
      Alert.alert(
        isBn ? 'আবেদন জমা হয়েছে' : 'Application Submitted',
        isBn
          ? 'আপনার ৩০ দিনের ফ্রি স্মার্ট কোচ অফারের আবেদন অ্যাডমিন রিভিউয়ের জন্য পাঠানো হয়েছে।'
          : 'Your 30-day free Smart Coach application has been sent to the Admin Panel for review.'
      );
    } catch (e: any) {
      Alert.alert(
        isBn ? 'আবেদন ব্যর্থ' : 'Not Eligible Yet',
        e.message || 'Could not submit application.'
      );
    } finally {
      setApplyingId(null);
    }
  };

  const current = streakSummary.current_streak || 0;
  const longest = streakSummary.longest_streak || current;
  const monthDone = streakSummary.monthly_completed_days || 0;
  const monthTotal = streakSummary.monthly_total_days || 30;
  const monthTarget = streakSummary.monthly_target_days || Math.ceil(monthTotal * 0.8);
  const monthPct = streakSummary.monthly_pct || 0;
  const progressTo30 = Math.min(100, Math.round((current / 30) * 100));
  const progressTo80 = Math.min(100, Math.round((monthDone / Math.max(1, monthTarget)) * 100));
  const spotsLeft = streakSummary.reward_spots_remaining ?? 100;

  const activeOffers = lbData?.offers || [];
  const userApps = lbData?.applications || [];
  const top10 = lbData?.top_10 || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1A1D21' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FFF7ED' },
                ]}
              >
                <Ionicons name="flame" size={20} color="#EA580C" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {isBn ? 'ধারাবাহিক স্ট্রিক ও লিডারবোর্ড' : 'Streak, Offers & Leaderboard'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {isBn
                    ? 'একটানা দিন গণনা • কোনো দিন মিস করলে রিসেট হয়'
                    : 'Continuous daily count • Resets if a day is missed'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
              ]}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 1. Continuous Counter Hero */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: isDark ? '#16191D' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.heroStatCol}>
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                  {isBn ? 'চলতি স্ট্রিক' : 'CURRENT STREAK'}
                </Text>
                <View style={styles.heroNumberRow}>
                  <Text style={[styles.heroNumber, { color: '#EA580C' }]}>{current}</Text>
                  <Text style={[styles.heroUnit, { color: theme.textSecondary }]}>
                    {isBn ? 'দিন' : current === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.heroDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
                ]}
              />

              <View style={styles.heroStatCol}>
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                  {isBn ? 'সর্বোচ্চ রেকর্ড' : 'ALL-TIME BEST'}
                </Text>
                <View style={styles.heroNumberRow}>
                  <Ionicons name="trophy-outline" size={20} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={[styles.heroNumber, { color: theme.textPrimary, fontSize: 26 }]}>
                    {longest}
                  </Text>
                  <Text style={[styles.heroUnit, { color: theme.textSecondary }]}>
                    {isBn ? 'দিন' : 'days'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. This Week Calendar Strip */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? '#16191D' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {isBn ? 'এই সপ্তাহের অগ্রগতি' : 'This Week Activity'}
              </Text>
              <View style={styles.weekRow}>
                {(streakSummary.week_days || []).map((d, idx) => {
                  const isDone = d.status === 'completed';
                  const isMissed = d.status === 'missed';
                  const isToday = d.status === 'today';

                  return (
                    <View key={idx} style={styles.weekNode}>
                      <View
                        style={[
                          styles.weekDot,
                          {
                            backgroundColor: isDone
                              ? '#10B981'
                              : isMissed
                              ? (isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2')
                              : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'),
                            borderColor: isToday
                              ? '#EA580C'
                              : isMissed
                              ? (isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA')
                              : 'transparent',
                            borderWidth: isToday || isMissed ? 1.5 : 0,
                          },
                        ]}
                      >
                        {isDone && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        {isMissed && <Ionicons name="close" size={13} color="#EF4444" />}
                        {!isDone && !isMissed && isToday && <View style={styles.todayInnerDot} />}
                      </View>
                      <Text
                        style={[
                          styles.weekLabel,
                          {
                            color: isDone ? '#10B981' : isToday ? '#EA580C' : theme.textSecondary,
                            fontWeight: isToday || isDone ? '700' : '500',
                          },
                        ]}
                      >
                        {d.day_label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 3. 80% Monthly Consistency Target */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? '#16191D' : '#F0FDF4',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
                },
              ]}
            >
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconTitle}>
                  <Ionicons name="ribbon-outline" size={18} color="#10B981" />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                    {isBn ? 'মাসিক ৮০% ধারাবাহিকতা লক্ষ্য' : '80% Monthly Consistency'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: streakSummary.monthly_80_unlocked
                        ? '#10B981'
                        : isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#DCFCE7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: streakSummary.monthly_80_unlocked ? '#FFFFFF' : '#059669' },
                    ]}
                  >
                    {monthPct}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                {streakSummary.monthly_80_unlocked
                  ? isBn
                    ? `অভিনন্দন! আপনি এই মাসে ${monthDone}/${monthTotal} দিন (${monthPct}%) সক্রিয় থেকে ৮০% লক্ষ্য অর্জন করেছেন।`
                    : `Achieved! You completed ${monthDone}/${monthTotal} days (${monthPct}%) this month.`
                  : isBn
                  ? `এই মাসে ৮০% অর্জনের জন্য ${monthTarget} দিন প্রয়োজন। আপনার বর্তমান অগ্রগতি: ${monthDone}/${monthTarget} দিন।`
                  : `Reach ${monthTarget} active days out of ${monthTotal} this month (${monthDone}/${monthTarget} completed).`}
              </Text>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCFCE7' },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressTo80}%`, backgroundColor: '#10B981' },
                  ]}
                />
              </View>
            </View>

            {/* 4. Dynamic Streak Offers & Apply for 30-Day Smart Coach */}
            {(activeOffers.length > 0 ? activeOffers : [{
              id: 'offer_30d_smart_coach',
              title: '30 Days Free Smart Coach',
              title_bn: '৩০ দিনের ফ্রি স্মার্ট কোচ অফার',
              description: `First 100 students with 30+ continuous streak days can apply for 30 days of free Smart Coach Pro.`,
              description_bn: 'একটানা ৩০ দিন স্ট্রিক পূর্ণ করা প্রথম ১০০ জন শিক্ষার্থী ফ্রি স্মার্ট কোচ প্রো অফারের জন্য আবেদন করতে পারবেন।',
              min_streak: 30,
              reward_days: 30,
              max_claims: 100,
              is_active: true,
            }]).map((offer) => {
              const existingApp = userApps.find((a) => a.offer_id === offer.id);
              const eligible = Math.max(current, longest) >= offer.min_streak;
              const offerPct = Math.min(100, Math.round((Math.max(current, longest) / Math.max(1, offer.min_streak)) * 100));

              return (
                <View
                  key={offer.id}
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: isDark ? '#201B18' : '#FFF7ED',
                      borderColor: isDark ? 'rgba(244, 123, 78, 0.3)' : '#FED7AA',
                    },
                  ]}
                >
                  <View style={styles.cardTitleRow}>
                    <View style={styles.cardIconTitle}>
                      <MaterialCommunityIcons name="crown-outline" size={19} color="#EA580C" />
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                        {isBn ? (offer.title_bn || offer.title) : offer.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: existingApp?.status === 'approved'
                            ? '#10B981'
                            : isDark
                            ? 'rgba(244, 123, 78, 0.2)'
                            : '#FFEDD5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: existingApp?.status === 'approved' ? '#FFFFFF' : '#EA580C' },
                        ]}
                      >
                        {existingApp?.status === 'approved'
                          ? (isBn ? 'অনুমোদিত' : 'Approved')
                          : existingApp?.status === 'pending'
                          ? (isBn ? 'অপেক্ষমান' : 'Pending')
                          : `${spotsLeft} / ${offer.max_claims} ${isBn ? 'বাকি' : 'left'}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                    {isBn ? (offer.description_bn || offer.description) : offer.description}
                  </Text>

                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFEDD5', marginBottom: 10 },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${offerPct || progressTo30}%`,
                          backgroundColor: existingApp?.status === 'approved' ? '#10B981' : '#EA580C',
                        },
                      ]}
                    />
                  </View>

                  {existingApp ? (
                    <View
                      style={[
                        styles.appliedBanner,
                        {
                          backgroundColor:
                            existingApp.status === 'approved'
                              ? 'rgba(16, 185, 129, 0.14)'
                              : 'rgba(245, 158, 11, 0.14)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={existingApp.status === 'approved' ? 'checkmark-circle' : 'time-outline'}
                        size={16}
                        color={existingApp.status === 'approved' ? '#10B981' : '#D97706'}
                      />
                      <Text
                        style={[
                          styles.appliedBannerText,
                          { color: existingApp.status === 'approved' ? '#059669' : '#D97706' },
                        ]}
                      >
                        {existingApp.status === 'approved'
                          ? isBn
                            ? 'আপনার প্রো অফার অনুমোদিত হয়েছে!'
                            : 'Approved! Your 30-day Smart Coach Pro is active.'
                          : isBn
                          ? 'আবেদন জমা হয়েছে — অ্যাডমিন যাচাই করছেন'
                          : 'Application submitted — awaiting Admin approval.'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.applyBtn,
                        {
                          backgroundColor: eligible ? '#EA580C' : isDark ? '#272B30' : '#E2E8F0',
                        },
                      ]}
                      disabled={!eligible || applyingId === offer.id}
                      onPress={() => handleApplyOffer(offer.id)}
                      activeOpacity={0.85}
                    >
                      {applyingId === offer.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name={eligible ? 'paper-plane-outline' : 'lock-closed-outline'}
                            size={15}
                            color={eligible ? '#FFFFFF' : theme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.applyBtnText,
                              { color: eligible ? '#FFFFFF' : theme.textSecondary },
                            ]}
                          >
                            {eligible
                              ? isBn
                                ? '৩০ দিনের ফ্রি স্মার্ট কোচ আবেদন করুন'
                                : 'Apply for 30 Days Free Smart Coach'
                              : isBn
                              ? `আবেদনের জন্য ${offer.min_streak} দিন প্রয়োজন (${current}/${offer.min_streak})`
                              : `Reach ${offer.min_streak}-day streak to apply (${current}/${offer.min_streak})`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* 5. Top 10 Streak Leaderboard */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? '#16191D' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconTitle}>
                  <Ionicons name="podium-outline" size={18} color="#EA580C" />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                    {isBn ? 'শীর্ষ ১০ স্ট্রিক লিডারবোর্ড' : 'Top 10 Streak Leaderboard'}
                  </Text>
                </View>
                {lbData?.my_rank && (
                  <View style={[styles.statusPill, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.18)' : '#FFF7ED' }]}>
                    <Text style={[styles.statusPillText, { color: '#EA580C' }]}>
                      {isBn ? `আপনার র‍্যাংক #${lbData.my_rank}` : `Your Rank #${lbData.my_rank}`}
                    </Text>
                  </View>
                )}
              </View>

              {loadingLb ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 14 }} />
              ) : top10.length === 0 ? (
                <Text style={[styles.cardDesc, { color: theme.textMuted, marginBottom: 0 }]}>
                  {isBn ? 'এখনও কোনো লিডারবোর্ড ডেটা নেই।' : 'Start your daily streak to claim Rank #1 on the leaderboard.'}
                </Text>
              ) : (
                <View style={styles.lbList}>
                  {top10.map((entry) => {
                    const isMe = entry.user_id === streakSummary.user_id;
                    return (
                      <View
                        key={entry.user_id}
                        style={[
                          styles.lbRow,
                          {
                            backgroundColor: isMe
                              ? isDark
                                ? 'rgba(244, 123, 78, 0.14)'
                                : '#FFF7ED'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.03)'
                              : '#F8FAFC',
                            borderColor: isMe
                              ? 'rgba(244, 123, 78, 0.4)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : '#EDF2F7',
                          },
                        ]}
                      >
                        <View style={styles.lbLeft}>
                          <View
                            style={[
                              styles.rankBadge,
                              {
                                backgroundColor:
                                  entry.rank === 1
                                    ? '#F59E0B'
                                    : entry.rank === 2
                                    ? '#94A3B8'
                                    : entry.rank === 3
                                    ? '#D97706'
                                    : isDark
                                    ? '#272B30'
                                    : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rankText,
                                { color: entry.rank <= 3 ? '#FFFFFF' : theme.textPrimary },
                              ]}
                            >
                              {entry.rank}
                            </Text>
                          </View>
                          <Text style={[styles.lbName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {entry.display_name}
                            {isMe ? (isBn ? ' (আপনি)' : ' (You)') : ''}
                          </Text>
                        </View>

                        <View style={styles.lbRight}>
                          <Ionicons name="flame" size={14} color="#EA580C" />
                          <Text style={[styles.lbStreakVal, { color: theme.textPrimary }]}>
                            {entry.current_streak}d
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroNumber: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },
  heroDivider: {
    width: 1,
    height: 42,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  weekNode: {
    alignItems: 'center',
    gap: 6,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  weekLabel: {
    fontSize: 11,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
  },
  applyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  appliedBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  lbList: {
    gap: 7,
    marginTop: 4,
  },
  lbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  lbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lbName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  lbRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lbStreakVal: {
    fontSize: 13,
    fontWeight: '700',
  },
});
