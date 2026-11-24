import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYS = {
  TOKEN: 'student_finance_auth_token',
  PIN_CODE: 'student_finance_app_pin',
  BIOMETRIC_ENABLED: 'student_finance_bio_enabled',
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  }
}

// Token Security
export async function saveAuthToken(token: string): Promise<void> {
  await setItem(KEYS.TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return await getItem(KEYS.TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  await deleteItem(KEYS.TOKEN);
}

// PIN Security
export async function saveAppPin(pin: string): Promise<void> {
  await setItem(KEYS.PIN_CODE, pin);
}

export async function getStoredAppPin(): Promise<string | null> {
  return await getItem(KEYS.PIN_CODE);
}

export async function clearAppPin(): Promise<void> {
  await deleteItem(KEYS.PIN_CODE);
}

export async function hasPinConfigured(): Promise<boolean> {
  const pin = await getStoredAppPin();
  return Boolean(pin && pin.length === 4);
}

// Biometrics
export async function isBiometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use 4-digit PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

