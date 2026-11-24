import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { submitRetrainingFeedback } from '../services/api';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  predictionId: string;
  studentInputs: any;
  language: Language;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  predictionId,
  studentInputs,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [actualRanOut, setActualRanOut] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (actualRanOut === null) return;
    setLoading(true);
    try {
      await submitRetrainingFeedback({
        prediction_id: predictionId,
        actual_ran_out_of_money: actualRanOut,
        feedback_notes: notes,
        student_inputs: studentInputs,
      });
      setSubmitted(true);
    } catch (err) {
      console.warn("Feedback submit failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setSubmitted(false);
    setActualRanOut(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{t.feedbackTitle}</Text>

          {submitted ? (
            <View style={styles.successState}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{t.feedbackSuccess}</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>
                  {language === 'bn' ? 'সম্পন্ন' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.promptText}>{t.feedbackPrompt}</Text>

              <View style={styles.choicesRow}>
                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    actualRanOut === true && styles.choiceBtnActiveHigh,
                  ]}
                  onPress={() => setActualRanOut(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.choiceText, actualRanOut === true && styles.choiceTextActive]}>
                    {t.feedbackYes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    actualRanOut === false && styles.choiceBtnActiveLow,
                  ]}
                  onPress={() => setActualRanOut(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.choiceText, actualRanOut === false && styles.choiceTextActive]}>
                    {t.feedbackNo}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={t.feedbackNotesPlaceholder}
                placeholderTextColor={THEME.colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    actualRanOut === null && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={actualRanOut === null || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitText}>{t.submitFeedback}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  dialog: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  dialogTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  promptText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.lg,
  },
  choicesRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  choiceBtn: {
    flex: 1,
    height: 48,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  choiceBtnActiveHigh: {
    backgroundColor: THEME.colors.riskHighBg,
    borderColor: THEME.colors.riskHighBorder,
  },
  choiceBtnActiveLow: {
    backgroundColor: THEME.colors.riskLowBg,
    borderColor: THEME.colors.riskLowBorder,
  },
  choiceText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  input: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    color: THEME.colors.textPrimary,
    ...THEME.typography.body,
    textAlignVertical: 'top',
    minHeight: 75,
    marginBottom: THEME.spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  cancelBtn: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
  },
  cancelText: {
    ...THEME.typography.button,
    color: THEME.colors.textMuted,
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    ...THEME.typography.button,
    color: '#FFFFFF',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  successIcon: {
    fontSize: 44,
    color: THEME.colors.riskLow,
    marginBottom: THEME.spacing.sm,
  },
  successText: {
    ...THEME.typography.body,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },
  doneBtn: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    paddingHorizontal: THEME.spacing.xxl,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    ...THEME.typography.button,
    color: '#FFFFFF',
  },
});
