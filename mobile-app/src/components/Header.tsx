import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { BRANDING } from '../constants/branding';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  language: Language;
  onToggleLanguage: () => void;
  showReset?: boolean;
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onToggleLanguage,
  showReset = false,
  onReset,
}) => {
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 6;

  return (
    <View style={[styles.safeHeaderWrapper, { paddingTop: safeTop }]}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <BrandLogo size="sm" />
          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {BRANDING.appName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {language === 'bn' ? BRANDING.appSubtitleBn : BRANDING.appSubtitleEn}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {showReset && onReset && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onReset}
              activeOpacity={0.7}
              accessibilityLabel="Reset assessment"
            >
              <Ionicons name="refresh" size={16} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.langPill}
            onPress={onToggleLanguage}
            activeOpacity={0.7}
            accessibilityLabel="Switch language"
          >
            <Ionicons name="globe-outline" size={12} color={THEME.colors.primaryLight} style={{ marginRight: 4 }} />
            <Text style={styles.langText}>{language === 'bn' ? 'English' : 'বাংলা'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeHeaderWrapper: {
    backgroundColor: 'rgba(6, 11, 25, 0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 10,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPill: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    color: THEME.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
});
