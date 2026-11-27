import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const DAILY_REMINDER_STORAGE_KEY = '@pockit_daily_reminder_settings';

export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
}

const DEFAULT_REMINDER_SETTINGS: DailyReminderSettings = {
  enabled: true,
  hour: 21,
  minute: 30,
};

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
  } catch {
    // Graceful handler setup
  }
}

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EA580C',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements & Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F47B4E',
      sound: 'default',
    });
  } catch {
    // Channel setup fallback
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureAndroidChannels();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function getDailyReminderSettings(): Promise<DailyReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
        hour: typeof parsed.hour === 'number' && parsed.hour >= 0 && parsed.hour <= 23 ? parsed.hour : 21,
        minute: typeof parsed.minute === 'number' && parsed.minute >= 0 && parsed.minute <= 59 ? parsed.minute : 30,
      };
    }
  } catch {}
  return { ...DEFAULT_REMINDER_SETTINGS };
}

export async function saveDailyReminderSettings(settings: DailyReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export async function cancelDailySpendingReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content?.data?.type === 'daily_reminder' || !item.content?.data?.type) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  }
}

/**
 * Schedules daily reminder push notification at user-defined hour/minute (default 9:30 PM).
 */
export async function scheduleDailySpendingReminder(
  language: 'en' | 'bn' = 'bn',
  hour = 21,
  minute = 30
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    await cancelDailySpendingReminder();

    const title = language === 'bn' ? 'আজকের খরচের হিসাব রাখুন' : "Track Today's Expenses";
    const body =
      language === 'bn'
        ? 'আজকের খরচের হিসাব কি লিখেছেন? আর্থিক ঝুঁকি স্কোর সঠিক রাখতে এখনই খরচ বা আয় যোগ করুন।'
        : 'Did you track today’s expenses? Log your spending now to keep your Risk Score accurate.';

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: 'daily-reminders' } : {}),
    } as any;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'daily_reminder' },
      },
      trigger,
    });
    return true;
  } catch {
    return false;
  }
}

export async function syncDailyReminderFromStorage(language: 'en' | 'bn' = 'bn'): Promise<void> {
  if (Platform.OS === 'web') return;
  const settings = await getDailyReminderSettings();
  if (settings.enabled) {
    await scheduleDailySpendingReminder(language, settings.hour, settings.minute);
  } else {
    await cancelDailySpendingReminder();
  }
}

export async function sendTestReminderNotification(language: 'en' | 'bn' = 'bn'): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'bn' ? 'দৈনিক রিমাইন্ডার সক্রিয় আছে' : 'Daily Reminder Active',
        body:
          language === 'bn'
            ? 'দারুণ! আপনার নির্ধারিত সময়ে প্রতিদিন এই রিমাইন্ডার পাঠানো হবে।'
            : 'Great! You will receive your daily spending reminder at your chosen time.',
        sound: true,
        data: { type: 'test_reminder' },
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendAnnouncementLocalNotification(title: string, message: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: true,
        data: { type: 'admin_announcement' },
      },
      trigger: null,
    });
  } catch {}
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
    await ensureAndroidChannels();
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
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to send high risk alert:', error);
  }
}
