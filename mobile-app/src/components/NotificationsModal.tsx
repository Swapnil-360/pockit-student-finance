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
  onOpenAppGuide?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  announcements,
  unreadIds,
  updateInfo,
  loading = false,
  language,
  onOpenAppGuide,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isBn = language === 'bn';

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FFF7ED' }]}>
                <Ionicons name="notifications" size={18} color="#F47B4E" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {isBn ? 'নোটিফিকেশন ও আপডেট' : 'Notifications & Updates'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {isBn ? 'অ্যাডমিন ঘোষণা ও অ্যাপ আপডেট' : 'Admin announcements & app updates'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {updateInfo?.hasUpdate && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="rocket-outline" size={16} color="#10B981" />
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                      {isBn
                        ? `নতুন ভার্সন উপলব্ধ (v${updateInfo.latestVersion})`
                        : `New Version Available (v${updateInfo.latestVersion})`}
                    </Text>
                  </View>
                  <Text style={[styles.cardDate, { color: '#10B981', fontWeight: '700' }]}>
                    {`v${updateInfo.currentVersion} → v${updateInfo.latestVersion}`}
                  </Text>
                </View>
                <Text style={[styles.cardMsg, { color: theme.textSecondary, marginBottom: 10 }]}>
                  {isBn
                    ? 'নতুন ফিচার ও বাগ ফিক্স পেতে এখনই নতুন APK আপডেট ডাউনলোড করুন।'
                    : 'A newer version of Pockit is ready on GitHub. Download the latest APK to update.'}
                </Text>
                <TouchableOpacity
                  onPress={() => openApkDownload(updateInfo.downloadUrl)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: '#10B981',
                    paddingVertical: 9,
                    borderRadius: 10,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                    {isBn ? 'আপডেট ও ডাউনলোড করুন' : 'Update & Download APK'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {loading && announcements.length === 0 && !updateInfo?.hasUpdate ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : announcements.length === 0 && !updateInfo?.hasUpdate ? (
              <View style={[styles.emptyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: theme.border }]}>
                <Ionicons name="notifications-off-outline" size={30} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  {isBn ? 'কোনো নতুন নোটিফিকেশন নেই' : 'You’re all caught up!'}
                </Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  {isBn
                    ? 'নতুন কোনো অ্যাপ আপডেট বা অ্যাডমিন ঘোষণা থাকলে এখানে দেখতে পাবেন।'
                    : 'New app updates and admin announcements will appear here.'}
                </Text>
              </View>
            ) : (
              announcements.map((item) => {
                const isUnread = unreadIds.includes(item.id);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isUnread
                          ? isDark
                            ? 'rgba(244, 123, 78, 0.10)'
                            : '#FFF7ED'
                          : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : '#F8FAFC',
                        borderColor: isUnread ? 'rgba(244, 123, 78, 0.35)' : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.cardTitleWrap}>
                        {isUnread && <View style={styles.unreadDot} />}
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      {!!item.created_at && (
                        <Text style={[styles.cardDate, { color: theme.textMuted }]}>
                          {formatDate(item.created_at)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.cardMsg, { color: theme.textSecondary }]}>
                      {item.message}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {onOpenAppGuide && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onOpenAppGuide();
              }}
              style={[styles.guideFooterBtn, { borderColor: theme.border }]}
              activeOpacity={0.75}
            >
              <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.guideFooterText, { color: theme.textSecondary }]}>
                {isBn ? 'অ্যাপ গাইড ও ফিচার পরিচিতি দেখুন' : 'View App Guide & Feature Tour'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '78%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.45)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 380,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F47B4E',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cardDate: {
    fontSize: 11,
  },
  cardMsg: {
    fontSize: 13,
    lineHeight: 19,
  },
  guideFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    marginTop: 8,
    borderTopWidth: 1,
  },
  guideFooterText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

