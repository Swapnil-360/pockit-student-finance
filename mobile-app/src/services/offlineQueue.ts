import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = '@pockit_offline_write_queue';

export interface OfflineQueueItem {
  id: string;
  type: 'add_expense' | 'add_income' | 'log_mess_meal';
  payload: Record<string, any>;
  createdAt: number;
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineAction(
  type: OfflineQueueItem['type'],
  payload: Record<string, any>
): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    createdAt: Date.now(),
  };
  const queue = await getOfflineQueue();
  queue.push(item);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export async function flushOfflineQueue(apiBaseUrl: string): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  const remaining: OfflineQueueItem[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const endpoint =
        item.type === 'add_expense'
          ? '/api/expenses'
          : item.type === 'add_income'
          ? '/api/incomes'
          : '/api/mess/meal';
      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        synced += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return synced;
}
