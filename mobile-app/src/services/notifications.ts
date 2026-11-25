import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set default notification handler behavior on native devices safely
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    // Graceful handler setup
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Schedules daily reminder push notification at 9:30 PM (or user defined hour/minute).
 */
export async function scheduleDailySpendingReminder(
  language: 'en' | 'bn' = 'bn',
  hour = 21,
  minute = 30
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Cancel existing scheduled daily notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const title = language === 'bn' ? 'আজকের খরচের হিসাব রাখুন' : "Track Today's Expenses";
    const body =
      language === 'bn'
        ? 'আজকের খরচের হিসাব কি লিখেছেন? আর্থিক ঝুঁকি স্কোর সঠিক রাখতে এখনই খরচ বা আয় যোগ করুন।'
        : 'Did you track today’s expenses? Log your spending now to keep your Risk Score accurate.';

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('daily-reminders', {
          name: 'Daily Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EA580C',
        });
      } catch (channelErr) {
        // Channel setup fallback on dev client
      }
    }

    const trigger: any = {
      type: (Notifications as any).SchedulableTriggerInputTypes?.DAILY || 'daily',
      hour,
      minute,
      channelId: 'daily-reminders',
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger,
    });
    return id;
  } catch (error) {
    // Suppress noisy dev-client warning when permission or channel manager is not yet ready
    return null;
  }
}

/**
 * Triggers instant local notification if a sudden expense pushes student into High Risk (>=70%).
 */
export async function sendHighRiskAlertNotification(
  riskScore: number,
  language: 'en' | 'bn' = 'bn'
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const title = language === 'bn' ? 'উচ্চ আর্থিক ঝুঁকি সতর্কতা!' : 'High Financial Risk Alert!';
    const body =
      language === 'bn'
        ? `আপনার ঝুঁকি স্কোর বেড়ে ${riskScore}% হয়েছে! মাস শেষ হওয়ার আগে বাজেট সংকটের তীব্র সম্ভাবনা। অপ্রয়োজনীয় খরচ এখনই সীমিত করুন।`
        : `Your risk score has surged to ${riskScore}%! High probability of month-end budget shortage. Freeze non-essential spending.`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('Failed to send high risk alert:', error);
  }
}

