import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { submitSubscriptionPayment, toggleDemoPro } from '../services/api';

interface ProSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  language: Language;
  onSubscribed: () => void;
}

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  visible,
  onClose,
  userId,
  language,
  onSubscribed,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const t = TRANSLATIONS[language];

  const handleVerifyTrx = async () => {
    const cleanTrx = trxId.trim();
    if (!cleanTrx || cleanTrx.length < 5) {
      Alert.alert(
        language === 'bn' ? 'সঠিক TrxID দিন' : 'Valid TrxID Required',
        language === 'bn'
          ? 'অনুগ্রহ করে bKash অথবা Nagad থেকে প্রাপ্ত সঠিক TrxID লিখুন।'
          : 'Please enter a valid Transaction ID from your payment confirmation SMS.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitSubscriptionPayment({
        user_id: userId,
        payment_method: paymentMethod,
        trx_id: cleanTrx,
        amount: 50,
      });

      Alert.alert(
        language === 'bn' ? 'অভিনন্দন! প্রো সক্রিয় হয়েছে' : 'Success! Pro AI Activated',
        t.subSuccessMessage,
        [{ text: 'OK', onPress: () => {
          setTrxId('');
          onSubscribed();
          onClose();
        }}]
      );
    } catch (e: any) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Activation Error',
        e.message || 'Could not verify transaction. Please check the TrxID.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoProToggle = async () => {
    setDemoLoading(true);
    try {
      await toggleDemoPro(userId, true);
      Alert.alert(
        language === 'bn' ? 'ডেমো প্রো সক্রিয়' : 'Demo Pro Activated',
        language === 'bn'
          ? 'টেস্টিংয়ের সুবিধার্থে প্রো এআই ফিচার সম্পূর্ণ সক্রিয় করা হয়েছে।'
          : 'Pro AI features unlocked for instant developer testing.',
        [{ text: 'OK', onPress: () => {
          onSubscribed();
          onClose();
        }}]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle demo pro.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.sheetContainer, { paddingBottom: safeBottom + 12 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>PRO AI COACH</Text>
              </View>
              <Text style={styles.modalTitle}>{t.proModalTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.modalSub}>{t.proModalSub}</Text>

            {/* Feature Comparison */}
            <View style={styles.comparisonBox}>
              <View style={styles.tierColumn}>
                <Text style={styles.tierColumnHeaderFree}>{t.freeTierBadge}</Text>
                <Text style={styles.featureItem}>• {t.freeFeature1}</Text>
                <Text style={styles.featureItem}>• {t.freeFeature2}</Text>
                <Text style={styles.featureItem}>• {t.freeFeature3}</Text>
              </View>

              <View style={[styles.tierColumn, styles.tierColumnPro]}>
                <View style={styles.proHeaderRow}>
                  <Text style={styles.tierColumnHeaderPro}>{t.proTierBadge}</Text>
                  <Text style={styles.priceTag}>৳50/mo</Text>
                </View>
                <Text style={[styles.featureItem, styles.featureItemPro]}>✓ {t.proFeature1}</Text>
                <Text style={[styles.featureItem, styles.featureItemPro]}>✓ {t.proFeature2}</Text>
                <Text style={[styles.featureItem, styles.featureItemPro]}>✓ {t.proFeature3}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.sectionTitle}>
              {language === 'bn' ? 'পেমেন্ট মাধ্যম বেছে নিন' : 'Select Payment Method'}
            </Text>
            <View style={styles.methodSelector}>
              {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodChip,
                    paymentMethod === method && styles.methodChipActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      paymentMethod === method && styles.methodChipTextActive,
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>{t.paymentInstructionsTitle}</Text>
              <Text style={styles.instructionsBody}>{t.paymentInstructions}</Text>
            </View>

            {/* TrxID Input */}
            <Text style={styles.inputLabel}>{t.trxIdLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.trxIdPlaceholder}
              placeholderTextColor={THEME.colors.textMuted}
              value={trxId}
              onChangeText={setTrxId}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {/* Submit Verification Button */}
            <TouchableOpacity
              style={[styles.verifyBtnWrap, submitting && styles.btnDisabled]}
              onPress={handleVerifyTrx}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyGradientBtn}
              >
                {submitting ? (
                  <ActivityIndicator color="#0D1117" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.verifyBtnText}>{t.verifyTrxBtn}</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#0D1117" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Instant Demo Pro Toggle for Testers */}
            <TouchableOpacity
              style={styles.demoProBtn}
              onPress={handleDemoProToggle}
              disabled={demoLoading}
              activeOpacity={0.8}
            >
              {demoLoading ? (
                <ActivityIndicator color={THEME.colors.primaryLight} size="small" />
              ) : (
                <Text style={styles.demoProBtnText}>{t.demoProBtn}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    maxHeight: '90%',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  proTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.xs,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
  },
  proTagText: {
    ...THEME.typography.caption,
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  modalTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollBody: {
    paddingBottom: 20,
  },
  modalSub: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  comparisonBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.lg,
  },
  tierColumn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.sm,
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tierColumnPro: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: THEME.colors.primaryLight,
  },
  tierColumnHeaderFree: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  proHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierColumnHeaderPro: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  priceTag: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  featureItem: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  featureItemPro: {
    color: THEME.colors.textPrimary,
  },
  sectionTitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  methodChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodChipActive: {
    backgroundColor: THEME.colors.primarySubtle,
    borderColor: THEME.colors.primaryLight,
  },
  methodChipText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  methodChipTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  instructionsCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.sm,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  instructionsTitle: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.accent,
    fontWeight: '700',
    marginBottom: 4,
  },
  instructionsBody: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  inputLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    color: THEME.colors.textPrimary,
    minHeight: 48,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: THEME.spacing.md,
  },
  verifyBtnWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: THEME.spacing.sm,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyGradientBtn: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1117',
    letterSpacing: -0.2,
  },
  demoProBtn: {
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
    borderRadius: THEME.radius.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  demoProBtnText: {
    ...THEME.typography.bodySmall,
    fontWeight: '600',
    color: THEME.colors.primaryLight,
  },
});

