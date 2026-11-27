import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';

const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/Swapnil-360/pockit-student-finance/releases/latest';
const FALLBACK_RELEASES_URL =
  'https://github.com/Swapnil-360/pockit-student-finance/releases/latest';
const NOTIFIED_VERSION_KEY = '@pockit_notified_update_version';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseUrl: string;
}

export function getCurrentAppVersion(): string {
  return String(Constants.expoConfig?.version || '2.0.1').replace(/^v/i, '').trim();
}

export function compareVersions(latest: string, current: string): number {
  const a = latest.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const b = current.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export async function checkForGitHubUpdate(): Promise<AppUpdateInfo> {
  const currentVersion = getCurrentAppVersion();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(GITHUB_LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseTitle: '',
        releaseNotes: '',
        downloadUrl: FALLBACK_RELEASES_URL,
        releaseUrl: FALLBACK_RELEASES_URL,
      };
    }

    const data = await res.json();
    const rawTag = String(data?.tag_name || currentVersion);
    const latestVersion = rawTag.replace(/^v/i, '').trim();
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    const assets: any[] = Array.isArray(data?.assets) ? data.assets : [];
    const apkAsset = assets.find((a) => String(a?.name || '').toLowerCase().endsWith('.apk'));
    const downloadUrl = apkAsset?.browser_download_url || data?.html_url || FALLBACK_RELEASES_URL;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseTitle: String(data?.name || `Pockit v${latestVersion}`),
      releaseNotes: String(data?.body || '').trim(),
      downloadUrl,
      releaseUrl: String(data?.html_url || FALLBACK_RELEASES_URL),
    };
  } catch {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseTitle: '',
      releaseNotes: '',
      downloadUrl: FALLBACK_RELEASES_URL,
      releaseUrl: FALLBACK_RELEASES_URL,
    };
  }
}

export async function checkForOtaUpdate(): Promise<boolean> {
  if (Platform.OS === 'web' || __DEV__) return false;
  try {
    const res = await Updates.checkForUpdateAsync();
    return Boolean(res.isAvailable);
  } catch {
    return false;
  }
}

export async function applyOtaUpdate(): Promise<boolean> {
  if (Platform.OS === 'web' || __DEV__) return false;
  try {
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      await Updates.reloadAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function shouldNotifyForVersion(latestVersion: string): Promise<boolean> {
  try {
    const lastNotified = await AsyncStorage.getItem(NOTIFIED_VERSION_KEY);
    if (lastNotified === latestVersion) return false;
    await AsyncStorage.setItem(NOTIFIED_VERSION_KEY, latestVersion);
    return true;
  } catch {
    return false;
  }
}

export async function openApkDownload(url: string): Promise<void> {
  try {
    await Linking.openURL(url || FALLBACK_RELEASES_URL);
  } catch {}
}
