const DEFAULT_API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
    ? window.location.origin
    : 'https://pockit-backend-eppq.onrender.com';

const TOKEN_KEY = 'pockit_admin_token';

export function getAdminToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function adminFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${DEFAULT_API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAdminToken();
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function loginAdmin(email: string, password: string) {
  const res = await fetch(`${DEFAULT_API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Invalid credentials');
  }
  const data = await res.json();
  setAdminToken(data.token);
  return data;
}

export const getOverview = () => adminFetch('/api/admin/overview');
export const listUsers = (search = '', filterTier = 'all') =>
  adminFetch(`/api/admin/users?search=${encodeURIComponent(search)}&filter_tier=${encodeURIComponent(filterTier)}`);
export const getUserDetail = (userId: string) => adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`);
export const setUserPro = (userId: string, is_pro: boolean, days = 30) =>
  adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/pro`, {
    method: 'POST',
    body: JSON.stringify({ is_pro, days }),
  });
export const resetUserPin = (userId: string) =>
  adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-pin`, { method: 'POST' });
export const adjustUserStreak = (userId: string, current_streak: number, longest_streak?: number) =>
  adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/streak`, {
    method: 'POST',
    body: JSON.stringify({ current_streak, longest_streak }),
  });
export const deleteUser = (userId: string) =>
  adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });

export const listSubscriptions = () => adminFetch('/api/admin/subscriptions');
export const updateSubscriptionStatus = (paymentId: string, status: 'approved' | 'rejected' | 'pending') =>
  adminFetch(`/api/admin/subscriptions/${encodeURIComponent(paymentId)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const getStreakLeaderboardAdmin = () => adminFetch('/api/admin/streak-leaderboard');
export const listOffers = () => adminFetch('/api/admin/offers');
export const upsertOffer = (offer: any) =>
  adminFetch('/api/admin/offers', { method: 'POST', body: JSON.stringify(offer) });
export const deleteOffer = (offerId: string) =>
  adminFetch(`/api/admin/offers/${encodeURIComponent(offerId)}`, { method: 'DELETE' });

export const listOfferApplications = () => adminFetch('/api/admin/offer-applications');
export const reviewOfferApplication = (appId: string, action: 'approve' | 'reject', admin_note = '') =>
  adminFetch(`/api/admin/offer-applications/${encodeURIComponent(appId)}`, {
    method: 'PUT',
    body: JSON.stringify({ action, admin_note }),
  });

export const listFeedback = () => adminFetch('/api/admin/feedback');
export const updateFeedbackStatus = (itemId: string, status: 'new' | 'reviewed' | 'resolved', admin_note = '') =>
  adminFetch(`/api/admin/feedback/${encodeURIComponent(itemId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, admin_note }),
  });
export const getModelInfo = () => adminFetch('/api/admin/model-info');

export const listAnnouncements = () => adminFetch('/api/admin/announcements');
export const saveAnnouncement = (title: string, message: string, is_active = true) =>
  adminFetch('/api/admin/announcements', {
    method: 'POST',
    body: JSON.stringify({ title, message, is_active }),
  });
export const toggleAnnouncement = (id: string, is_active: boolean) =>
  adminFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ is_active }),
  });
export const deleteAnnouncement = (id: string) =>
  adminFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export async function downloadExportFile(endpoint: string, filename: string) {
  const token = getAdminToken();
  const res = await fetch(`${DEFAULT_API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

