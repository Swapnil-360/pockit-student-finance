import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { AppAnnouncement } from '../services/api';
import { AppUpdateInfo, openApkDownload } from '../services/appUpdater';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: AppAnnouncement[];
  unreadIds: string[];
  updateInfo?: AppUpdateInfo | null;
  loading?: boolean;
  language: 'en' | 'bn';
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  announcements,
  unreadIds,
  updateInfo,
  loading = false,
  language,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isBn = language === 'bn';

  const totalUnread = unreadIds.length + (updateInfo?.hasUpdate ? 1 : 0);

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      const normalized = iso.includes(' ') && !iso.includes('T') ? iso.replace(' ', 'T') : iso;
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getItemMeta = (item: AppAnnouncement) => {
    const t = (item.title || '').toLowerCase();
    if (item.id.startsWith('offer_notice_') || t.includes('giveaway') || t.includes('reward') || t.includes('pro')) {
      return {
        icon: 'gift-outline' as const,
        color: '#F47B4E',
        bg: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FFF7ED',
        tag: isBn ? 'অফার' : 'Offer',
      };
    }
    if (t.includes('update') || t.includes('version') || t.includes('v2.')) {
      return {
        icon: 'sparkles-outline' as const,
        color: '#38BDF8',
        bg: isDark ? 'rgba(56, 189, 248, 0.16)' : '#F0F9FF',
        tag: isBn ? 'আপডেট' : 'Update',
      };
    }
    return {
      icon: 'megaphone-outline' as const,
      color: '#10B981',
      bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5',
      tag: isBn ? 'ঘোষণা' : 'Notice',
    };
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 22),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : '#CBD5E1' }]} />

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FFF7ED' }]}>
                <Ionicons name="notifications" size={19} color="#F47B4E" />
              </View>
              <View>
                <View style={styles.titleBadgeRow}>
                  <Text style={[styles.title, { color: theme.textPrimary }]}>
                    {isBn ? 'নোটিফিকেশন' : 'Notifications'}
                  </Text>
                  {totalUnread > 0 && (
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>
                        {isBn ? `${totalUnread} নতুন` : `${totalUnread} new`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {isBn ? 'অ্যাপ আপডেট, অফার ও অ্যাডমিন ঘোষণা' : 'Updates, rewards & official notices'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {updateInfo?.hasUpdate && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                    <Ionicons name="cloud-download-outline" size={18} color="#10B981" />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                        {isBn
                          ? `নতুন ভার্সন উপলব্ধ (v${updateInfo.latestVersion})`
                          : `Pockit v${updateInfo.latestVersion} Available`}
                      </Text>
                      <View style={[styles.tagPill, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                        <Text style={[styles.tagText, { color: '#10B981' }]}>
                          {`v${updateInfo.currentVersion} → v${updateInfo.latestVersion}`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cardMsg, { color: theme.textSecondary, marginBottom: 10 }]}>
                      {isBn
                        ? 'নতুন ফিচার ও বাগ ফিক্স পেতে এখনই লেটেস্ট APK ডাউনলোড করুন।'
                        : 'A newer version of Pockit is ready on GitHub. Download the latest APK to update.'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openApkDownload(updateInfo.downloadUrl)}
                      style={styles.downloadBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-down-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.downloadBtnText}>
                        {isBn ? 'আপডেট ও ডাউনলোড করুন' : 'Update & Download APK'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {loading && announcements.length === 0 && !updateInfo?.hasUpdate ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : announcements.length === 0 && !updateInfo?.hasUpdate ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
                  <Ionicons name="notifications-off-outline" size={26} color={theme.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  {isBn ? 'কোনো নতুন নোটিফিকেশন নেই' : 'You’re all caught up'}
                </Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  {isBn
                    ? 'নতুন অ্যাপ আপডেট, অফার বা ঘোষণা থাকলে এখানে দেখতে পাবেন।'
                    : 'App updates, streak offers, and official announcements will appear here.'}
                </Text>
              </View>
            ) : (
              announcements.map((item) => {
                const isUnread = unreadIds.includes(item.id);
                const meta = getItemMeta(item);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isUnread
                          ? isDark
                            ? 'rgba(244, 123, 78, 0.09)'
                            : '#FFFBF7'
                          : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : '#F8FAFC',
                        borderColor: isUnread
                          ? isDark
                            ? 'rgba(244, 123, 78, 0.35)'
                            : '#FED7AA'
                          : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.cardRow}>
                      <View style={[styles.cardIconBox, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={17} color={meta.color} />
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          <View style={styles.cardTitleWrap}>
                            {isUnread && <View style={styles.unreadDot} />}
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                              {item.title}
                            </Text>
                          </View>
                          <View style={[styles.tagPill, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.tagText, { color: meta.color }]}>{meta.tag}</Text>
                          </View>
                        </View>
                        <Text style={[styles.cardMsg, { color: theme.textSecondary }]}>
                          {item.message}
                        </Text>
                        {!!item.created_at && (
                          <Text style={[styles.cardDate, { color: theme.textMuted }]}>
                            {formatDate(item.created_at)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '80%',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  newPill: {
    backgroundColor: '#F47B4E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 440,
  },
  listContent: {
    paddingBottom: 6,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cardBody: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F47B4E',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 19,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardMsg: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardDate: {
    fontSize: 11,
    marginTop: 7,
    fontWeight: '500',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 11,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
