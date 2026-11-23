import type {
  AdminOverviewResponse,
  AdminStatusResponse,
  AppSettings,
  AuthMeResponse,
  AuthSessionResponse,
  CutId,
  DayVoteKey,
  ExperiencePost,
  FriendGroup,
  GroupZoneFilter,
  ParrilleroProfile,
  ParrilleroRank,
  PostComment,
  PublicStateResponse,
} from '../types';

const VISITOR_STORAGE_KEY = 'corte_pilsen_visitor_id_v1';
const PARRILLERO_STORAGE_KEY = 'corte_pilsen_parrillero_id_v1';
const AUTH_TOKEN_KEY = 'corte_pilsen_auth_token_v1';

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr-visitor';
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing && existing.length >= 6) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `v-${crypto.randomUUID()}`
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'anon-visitor';
  }
}

export function getStoredParrilleroId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PARRILLERO_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredParrilleroId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(PARRILLERO_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(PARRILLERO_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function buildPublicHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-visitor-id': getOrCreateVisitorId(),
  };
  const parrilleroId = getStoredParrilleroId();
  if (parrilleroId) {
    headers['x-parrillero-id'] = parrilleroId;
  }
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' && data.error.trim().length > 0
        ? data.error
        : `Error de servidor (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPublicState(): Promise<PublicStateResponse> {
  const res = await fetch('/api/state', {
    method: 'GET',
    headers: buildPublicHeaders(),
    cache: 'no-store',
  });
  const state = await parseJsonResponse<PublicStateResponse>(res);
  if (getStoredParrilleroId() && !state.profile) {
    setStoredParrilleroId(null);
  }
  return state;
}

export async function registerCarnet(input: {
  existingId?: string | null;
  name: string;
  city: string;
  favoriteCut: string;
  avatarStyle: ParrilleroProfile['avatarStyle'];
}): Promise<ParrilleroProfile> {
  const res = await fetch('/api/registrations', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse<{ profile: ParrilleroProfile }>(res);
  setStoredParrilleroId(data.profile.id);
  return data.profile;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  ci?: string;
  city: string;
  favoriteCut: string;
  avatarStyle: ParrilleroProfile['avatarStyle'];
}): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse<AuthSessionResponse>(res);
  setAuthToken(data.token);
  setStoredParrilleroId(data.profile.id);
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonResponse<AuthSessionResponse>(res);
  setAuthToken(data.token);
  setStoredParrilleroId(data.profile.id);
  return data;
}

export async function getMe(): Promise<AuthMeResponse> {
  const token = getAuthToken();
  if (!token) return { authenticated: false, profile: null };
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: buildPublicHeaders(),
      cache: 'no-store',
    });
    const data = await parseJsonResponse<AuthMeResponse>(res);
    if (data.authenticated && data.profile) {
      setStoredParrilleroId(data.profile.id);
    } else {
      setAuthToken(null);
    }
    return data;
  } catch {
    return { authenticated: false, profile: null };
  }
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: buildPublicHeaders(),
  }).catch(() => {});
  setAuthToken(null);
  setStoredParrilleroId(null);
}

export async function submitVote(input: {
  parrilleroId: string;
  dayKey: DayVoteKey;
  cutId: CutId;
  bossChoice?: 'retador' | 'challenger' | null;
}): Promise<PublicStateResponse> {
  const res = await fetch('/api/votes', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify(input),
  });
  return parseJsonResponse<PublicStateResponse>(res);
}

export async function createFriendGroupApi(input: {
  name: string;
  zone: Exclude<GroupZoneFilter, 'Todas'>;
  neighborhood: string;
  captainName: string;
  members: string[];
  favoriteCut: string;
  motto: string;
}): Promise<FriendGroup> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse<{ group: FriendGroup }>(res);
  return data.group;
}

export async function toggleGroupLikeApi(groupId: string): Promise<PublicStateResponse> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/like`, {
    method: 'POST',
    headers: buildPublicHeaders(),
  });
  return parseJsonResponse<PublicStateResponse>(res);
}

export async function createPostApi(input: {
  caption: string;
  cookingPoint: ExperiencePost['cookingPoint'];
  image: string;
  authorRank: ParrilleroRank;
}): Promise<ExperiencePost> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse<{ post: ExperiencePost }>(res);
  return data.post;
}

export async function togglePostFireApi(postId: string): Promise<PublicStateResponse> {
  const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/fire`, {
    method: 'POST',
    headers: buildPublicHeaders(),
  });
  return parseJsonResponse<PublicStateResponse>(res);
}

export async function addCommentApi(postId: string, text: string): Promise<PostComment> {
  const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: buildPublicHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await parseJsonResponse<{ comment: PostComment }>(res);
  return data.comment;
}

// ============================================================================
// Admin API (Bearer token kept strictly in React memory)
// ============================================================================
function adminHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminStatus(token?: string | null): Promise<AdminStatusResponse> {
  const res = await fetch('/api/admin/status', {
    method: 'GET',
    headers: adminHeaders(token),
    cache: 'no-store',
  });
  return parseJsonResponse<AdminStatusResponse>(res);
}

export async function claimAdminPasscode(passcode: string): Promise<{ token: string }> {
  const res = await fetch('/api/admin/claim', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ passcode }),
  });
  return parseJsonResponse<{ token: string }>(res);
}

export async function loginAdmin(passcode: string): Promise<{ token: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ passcode }),
  });
  return parseJsonResponse<{ token: string }>(res);
}

export async function loginAdminWithCredentials(
  email: string,
  password: string
): Promise<{ token: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse<{ token: string }>(res);
}

export async function changeAdminPassword(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ newPassword }),
  });
  return parseJsonResponse<{ ok: boolean; message: string }>(res);
}

export async function exportVotersCsv(token: string): Promise<void> {
  const res = await fetch('/api/admin/export/voters.csv', {
    method: 'GET',
    headers: adminHeaders(token),
  });
  if (!res.ok) {
    throw new Error('Error al descargar el padrón de votantes.');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `padron-oficial-corte-pilsen-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function logoutAdmin(token: string): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers: adminHeaders(token),
  }).catch(() => {});
}

export async function fetchAdminOverview(token: string): Promise<AdminOverviewResponse> {
  const res = await fetch('/api/admin/overview', {
    method: 'GET',
    headers: adminHeaders(token),
    cache: 'no-store',
  });
  return parseJsonResponse<AdminOverviewResponse>(res);
}

export async function fetchAdminSchemaSql(token: string): Promise<string> {
  const res = await fetch('/api/admin/schema.sql', {
    method: 'GET',
    headers: adminHeaders(token),
  });
  const data = await parseJsonResponse<{ sql: string }>(res);
  return data.sql;
}

export async function updateAdminSettings(
  token: string,
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: adminHeaders(token),
    body: JSON.stringify(patch),
  });
  const data = await parseJsonResponse<{ settings: AppSettings }>(res);
  return data.settings;
}

export async function deleteAdminGroup(token: string, groupId: string): Promise<void> {
  const res = await fetch(`/api/admin/groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  await parseJsonResponse<{ ok: boolean }>(res);
}

export async function deleteAdminPost(token: string, postId: string): Promise<void> {
  const res = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  await parseJsonResponse<{ ok: boolean }>(res);
}

export async function deleteAdminComment(
  token: string,
  postId: string,
  commentId: string
): Promise<void> {
  const res = await fetch(
    `/api/admin/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(token),
    }
  );
  await parseJsonResponse<{ ok: boolean }>(res);
}

export async function deleteAdminRegistration(token: string, parrilleroId: string): Promise<void> {
  const res = await fetch(`/api/admin/registrations/${encodeURIComponent(parrilleroId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  await parseJsonResponse<{ ok: boolean }>(res);
}

export async function resetAdminVotes(token: string): Promise<number> {
  const res = await fetch('/api/admin/votes/reset', {
    method: 'POST',
    headers: adminHeaders(token),
  });
  const data = await parseJsonResponse<{ ok: boolean; removed: number }>(res);
  return data.removed;
}
