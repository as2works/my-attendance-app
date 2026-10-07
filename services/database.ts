
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import {
  User,
  Schedule,
  History,
  SystemConfig,
  GroupId,
  AccessLink,
  AccessLinkRole,
} from '../types';

const client = generateClient<Schema>();

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export type HistoryQueryOptions = {
  includeProcessed?: boolean;
  limit?: number;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message?: string };

async function invoke<T>(action: string, payload?: unknown, tokenOverride?: string | null): Promise<T> {
  const token = tokenOverride === undefined ? accessToken : tokenOverride;
  const { data, errors } = await client.mutations.invokeAppApi({
    token: token || undefined,
    action,
    payload: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const rawError = errors?.[0]?.message;
  if (rawError) {
    if (rawError.includes('INVALID_REISSUE_PASSWORD')) throw new Error('INVALID_REISSUE_PASSWORD');
    if (rawError.includes('UNAUTHORIZED')) throw new Error('UNAUTHORIZED');
    if (rawError.includes('FORBIDDEN')) throw new Error('FORBIDDEN');
    try {
      const nested = JSON.parse(rawError) as ApiResult<T>;
      if (nested && nested.ok === false) throw new Error(nested.code || 'API_ERROR');
    } catch (e: any) {
      if (e?.message && e.message !== rawError && !String(e.message).includes('JSON')) throw e;
    }
    throw new Error(rawError);
  }

  if (typeof data !== 'string') {
    throw new Error('EMPTY_RESPONSE');
  }

  const parsed = JSON.parse(data) as ApiResult<T>;
  if (!parsed.ok) {
    throw new Error(parsed.code || 'API_ERROR');
  }
  return parsed.data;
}

export const db = {
  ensureSeed: async () => invoke<{ ready: boolean }>('ensureSeed', undefined, null),

  getUsers: async (groupId?: GroupId): Promise<User[]> =>
    invoke<User[]>('getUsers', { groupId }),

  saveUsers: async (users: User[]) => {
    await invoke('saveUsers', { users });
  },

  saveUser: async (user: User) => {
    await invoke('saveUser', user);
  },

  moveUserToGroup: async (userId: string, targetGroupId: GroupId) => {
    await invoke('moveUserToGroup', { userId, targetGroupId });
  },

  deleteUser: async (id: string) => {
    await invoke('deleteUser', { id });
  },

  getSchedulesForMonth: async (
    userIds: string[],
    year: number,
    month: number,
    groupId?: GroupId
  ): Promise<Schedule[]> =>
    invoke<Schedule[]>('getSchedulesForMonth', { userIds, year, month, groupId }),

  getSchedulesForUser: async (userId: string, groupId?: GroupId): Promise<Schedule[]> =>
    invoke<Schedule[]>('getSchedulesForUser', { userId, groupId }),

  updateSchedules: async (updates: Schedule[], groupId?: GroupId) => {
    await invoke('updateSchedules', { updates, groupId });
  },

  getHistories: async (groupId: GroupId, options: HistoryQueryOptions = {}): Promise<History[]> =>
    invoke<History[]>('getHistories', {
      groupId,
      includeProcessed: options.includeProcessed,
      limit: options.limit,
    }),

  addHistory: async (history: Omit<History, 'id' | 'createdAt'>) => {
    await invoke('addHistory', history);
  },

  updateHistoryStatus: async (id: string, isProcessed: boolean) => {
    await invoke('updateHistoryStatus', { id, isProcessed });
  },

  getConfig: async (): Promise<SystemConfig> => invoke<SystemConfig>('getConfig'),

  saveConfig: async (config: SystemConfig) => {
    await invoke('saveConfig', config);
  },

  resolveAccessLink: async (linkId: string): Promise<AccessLink | null> => {
    try {
      return await invoke<AccessLink>('resolveAccess', undefined, linkId);
    } catch (e: any) {
      if (String(e?.message).includes('UNAUTHORIZED')) return null;
      throw e;
    }
  },

  listAccessLinks: async (): Promise<AccessLink[]> =>
    invoke<AccessLink[]>('listAccessLinks'),

  reissueAccessLink: async (params: {
    role: AccessLinkRole;
    groupId?: GroupId;
    password: string;
  }): Promise<AccessLink> =>
    invoke<AccessLink>('reissueAccessLink', params),
};
