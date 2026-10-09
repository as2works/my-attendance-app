import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/app-api';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

type Role = 'ADMIN' | 'GENERAL';
type GroupId = string;
type Session = { linkId: string; role: Role; groupId?: GroupId };

type Args = {
  token?: string | null;
  action: string;
  payload?: string | null;
};

type GroupRecord = {
  id: string;
  name: string;
  hasLodgingStatuses: boolean;
  order: number;
};

const DEFAULT_GROUP_IDS = { DORM: 'dorm', HOME: 'home' } as const;
const BASE_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', '-']);
const LODGING_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', 'in', 'out', '-']);
const USER_NOTE_MAX_LENGTH = 300;

function parsePayload(raw?: string | null): any {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('INVALID_PAYLOAD');
  }
}

function ok(data: unknown) {
  return JSON.stringify({ ok: true, data });
}

function fail(code: string, message?: string): never {
  throw new Error(JSON.stringify({ ok: false, code, message: message || code }));
}

function parseHolidays(raw: unknown): string[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  return Array.from(
    new Set(
      list.filter(
        (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
      )
    )
  ).sort();
}

function holidaysToJson(holidays: string[]): string {
  return JSON.stringify(parseHolidays(holidays));
}

function requireId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) fail('BAD_REQUEST', field);
  return value.trim();
}

function normalizeNote(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n/g, '\n').trim().slice(0, USER_NOTE_MAX_LENGTH);
}

function mapGroup(g: any): GroupRecord {
  return {
    id: g.id,
    name: g.name || g.id,
    hasLodgingStatuses: !!g.hasLodgingStatuses,
    order: typeof g.order === 'number' ? g.order : 0,
  };
}

async function listGroupsSorted(): Promise<GroupRecord[]> {
  const { data } = await client.models.Group.list({ limit: 100 });
  return data.map(mapGroup).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
}

async function assertGroupExists(groupId: string): Promise<GroupRecord> {
  const { data } = await client.models.Group.get({ id: groupId });
  if (!data) fail('NOT_FOUND', 'group');
  return mapGroup(data);
}

function isStatusAllowed(group: GroupRecord, status: string) {
  return (group.hasLodgingStatuses ? LODGING_STATUSES : BASE_STATUSES).has(status);
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

async function resolveSession(token?: string | null): Promise<Session> {
  if (!token) fail('UNAUTHORIZED', 'token required');
  const { data } = await client.models.AccessLink.get({ id: token });
  if (!data?.role) fail('UNAUTHORIZED', 'invalid token');
  if (data.role === 'ADMIN') {
    return { linkId: data.id, role: 'ADMIN' };
  }
  if (!data.groupId) fail('UNAUTHORIZED', 'invalid general token');
  return { linkId: data.id, role: 'GENERAL', groupId: data.groupId };
}

function requireAdmin(session: Session) {
  if (session.role !== 'ADMIN') fail('FORBIDDEN');
}

async function effectiveGroupId(session: Session, requested?: string): Promise<string> {
  if (session.role === 'GENERAL') {
    if (!session.groupId) fail('UNAUTHORIZED', 'invalid general token');
    return session.groupId;
  }
  if (requested) {
    await assertGroupExists(requested);
    return requested;
  }
  const groups = await listGroupsSorted();
  if (!groups.length) fail('NOT_FOUND', 'no groups');
  return groups[0].id;
}

async function ensureGeneralLink(groupId: string) {
  const { data: links } = await client.models.AccessLink.list({ limit: 200 });
  const exists = links.some((l) => l.role === 'GENERAL' && l.groupId === groupId);
  if (exists) return;
  const id = crypto.randomUUID();
  await client.models.AccessLink.create({ id, role: 'GENERAL', groupId });
  console.info('[AccessLinks created]', `GENERAL(${groupId})=${id}`);
}

async function ensureSeed() {
  const defaults = [
    { id: DEFAULT_GROUP_IDS.DORM, name: '寮', hasLodgingStatuses: true, order: 0 },
    { id: DEFAULT_GROUP_IDS.HOME, name: '自宅', hasLodgingStatuses: false, order: 1 },
  ];

  for (const g of defaults) {
    const existing = await client.models.Group.get({ id: g.id });
    if (!existing.data) {
      await client.models.Group.create(g);
    }
  }

  const { data: links } = await client.models.AccessLink.list({ limit: 200 });
  const created: string[] = [];
  if (!links.some((l) => l.role === 'ADMIN')) {
    const id = crypto.randomUUID();
    await client.models.AccessLink.create({ id, role: 'ADMIN' });
    created.push(`ADMIN=${id}`);
  }

  let config = (await client.models.Config.get({ id: 'system' })).data as any;
  if (!config) {
    const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
      (b % 36).toString(36)
    ).join('');
    await client.models.Config.create({
      id: 'system',
      seasonStartDate: '2026-01-01',
      seasonEndDate: '2026-03-31',
      reissuePassword: password,
      seedVersion: 0,
    });
    config = (await client.models.Config.get({ id: 'system' })).data;
  } else if (!config.reissuePassword) {
    const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
      (b % 36).toString(36)
    ).join('');
    await client.models.Config.update({ id: 'system', reissuePassword: password });
  }

  if (!config?.seedVersion || config.seedVersion < 1) {
    const { data: users } = await client.models.User.list({ limit: 200 });
    await Promise.all(
      users
        .filter((u) => !u.groupId)
        .map((u) => client.models.User.update({ id: u.id, groupId: DEFAULT_GROUP_IDS.DORM }))
    );
    const { data: histories } = await client.models.History.list({ limit: 200 });
    await Promise.all(
      histories
        .filter((h) => !h.groupId)
        .map((h) =>
          client.models.History.update({
            id: h.id,
            groupId: DEFAULT_GROUP_IDS.DORM,
            recordedAt: h.recordedAt || h.createdAt || new Date().toISOString(),
          })
        )
    );
    await client.models.Config.update({ id: 'system', seedVersion: 1 });
    config = { ...config, seedVersion: 1 };
  }

  if (!config?.seedVersion || config.seedVersion < 2) {
    for (const g of defaults) {
      const existing = await client.models.Group.get({ id: g.id });
      if (existing.data) {
        await client.models.Group.update({
          id: g.id,
          name: existing.data.name || g.name,
          hasLodgingStatuses:
            typeof existing.data.hasLodgingStatuses === 'boolean'
              ? existing.data.hasLodgingStatuses
              : g.hasLodgingStatuses,
          order: typeof existing.data.order === 'number' ? existing.data.order : g.order,
        });
      }
    }
    await client.models.Config.update({ id: 'system', seedVersion: 2 });
  }

  const groups = await listGroupsSorted();
  for (const g of groups) {
    await ensureGeneralLink(g.id);
  }

  if (created.length) {
    console.info('[AccessLinks created]', created.join(', '));
  }

  return { ready: true };
}

async function getUsers(session: Session, payload: any) {
  const groupId = await effectiveGroupId(session, payload.groupId);
  const { data: users } = await client.models.User.listUsersByGroup(
    { groupId },
    { sortDirection: 'ASC', limit: 200 }
  );
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    groupId: u.groupId || groupId,
    note: typeof u.note === 'string' ? u.note : '',
  }));
}

async function assertUserInGroup(userId: string, groupId: GroupId) {
  const { data } = await client.models.User.get({ id: userId });
  if (!data || data.groupId !== groupId) fail('FORBIDDEN', 'user not in group');
  return data;
}

async function moveHistoriesForUsers(userIds: string[], targetGroupId: string) {
  for (const userId of userIds) {
    const { data: histories } = await client.models.History.list({
      filter: { userId: { eq: userId } },
      limit: 500,
    });
    await Promise.all(
      histories.map((h) =>
        client.models.History.update({
          id: h.id,
          groupId: targetGroupId,
          recordedAt: h.recordedAt || h.createdAt || new Date().toISOString(),
        })
      )
    );
  }
}

async function deleteGeneralLinksForGroup(groupId: string) {
  const { data: links } = await client.models.AccessLink.list({ limit: 200 });
  await Promise.all(
    links
      .filter((l) => l.role === 'GENERAL' && l.groupId === groupId)
      .map((l) => client.models.AccessLink.delete({ id: l.id }))
  );
}

export const handler = async (event: { arguments: Args }) => {
  const { token, action, payload: payloadRaw } = event.arguments;
  const payload = parsePayload(payloadRaw);

  try {
    if (action === 'ensureSeed') {
      return ok(await ensureSeed());
    }

    if (action === 'resolveAccess') {
      const session = await resolveSession(token);
      return ok({
        id: session.linkId,
        role: session.role,
        groupId: session.groupId,
      });
    }

    const session = await resolveSession(token);

    switch (action) {
      case 'getConfig': {
        await ensureSeed();
        const config = (await client.models.Config.get({ id: 'system' })).data as any;
        if (!config) fail('NOT_FOUND', 'config');
        return ok({
          id: 'system',
          seasonStartDate: config.seasonStartDate,
          seasonEndDate: config.seasonEndDate,
          holidays: parseHolidays(config.holidaysJson ?? config.holidays),
        });
      }
      case 'saveConfig': {
        requireAdmin(session);
        const holidays = parseHolidays(payload.holidays);
        const { data: updated, errors } = await client.models.Config.update({
          id: 'system',
          seasonStartDate: payload.seasonStartDate,
          seasonEndDate: payload.seasonEndDate,
          holidaysJson: holidaysToJson(holidays),
        });
        if (errors?.length || !updated) {
          fail('SAVE_FAILED', errors?.[0]?.message || 'config update failed');
        }
        return ok(true);
      }
      case 'listGroups': {
        await ensureSeed();
        return ok(await listGroupsSorted());
      }
      case 'createGroup': {
        requireAdmin(session);
        const name = requireId(payload.name, 'name');
        const hasLodgingStatuses = !!payload.hasLodgingStatuses;
        const groups = await listGroupsSorted();
        if (groups.some((g) => g.name === name)) fail('DUPLICATE_NAME', name);
        const id = crypto.randomUUID();
        const order = groups.length ? Math.max(...groups.map((g) => g.order)) + 1 : 0;
        await client.models.Group.create({ id, name, hasLodgingStatuses, order });
        await ensureGeneralLink(id);
        return ok({ id, name, hasLodgingStatuses, order });
      }
      case 'updateGroup': {
        requireAdmin(session);
        const id = requireId(payload.id, 'id');
        await assertGroupExists(id);
        const patch: { id: string; name?: string; hasLodgingStatuses?: boolean } = { id };
        if (typeof payload.name === 'string' && payload.name.trim()) {
          const name = payload.name.trim();
          const groups = await listGroupsSorted();
          if (groups.some((g) => g.id !== id && g.name === name)) fail('DUPLICATE_NAME', name);
          patch.name = name;
        }
        if (typeof payload.hasLodgingStatuses === 'boolean') {
          patch.hasLodgingStatuses = payload.hasLodgingStatuses;
        }
        await client.models.Group.update(patch);
        return ok(await assertGroupExists(id));
      }
      case 'reorderGroups': {
        requireAdmin(session);
        const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
        if (!ids.length) fail('BAD_REQUEST', 'ids');
        await Promise.all(
          ids.map((id, index) => client.models.Group.update({ id, order: index }))
        );
        return ok(await listGroupsSorted());
      }
      case 'deleteGroup': {
        requireAdmin(session);
        const sourceId = requireId(payload.id, 'id');
        const targetId = requireId(payload.targetGroupId, 'targetGroupId');
        if (sourceId === targetId) fail('BAD_REQUEST', 'same group');
        await assertGroupExists(sourceId);
        await assertGroupExists(targetId);
        const groups = await listGroupsSorted();
        if (groups.length <= 1) fail('LAST_GROUP', 'cannot delete last group');

        const { data: users } = await client.models.User.listUsersByGroup(
          { groupId: sourceId },
          { limit: 200 }
        );
        const { data: targetUsers } = await client.models.User.listUsersByGroup(
          { groupId: targetId },
          { limit: 200 }
        );
        let order = targetUsers.length;
        const userIds = users.map((u) => u.id);
        for (const u of users) {
          await client.models.User.update({
            id: u.id,
            groupId: targetId,
            order: order++,
          });
        }
        await moveHistoriesForUsers(userIds, targetId);
        await deleteGeneralLinksForGroup(sourceId);
        await client.models.Group.delete({ id: sourceId });
        return ok({
          movedUsers: userIds.length,
          targetGroupId: targetId,
        });
      }
      case 'getUsers': {
        return ok(await getUsers(session, payload));
      }
      case 'saveUserNote': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        const user = await assertUserInGroup(payload.userId, groupId);
        const next = normalizeNote(payload.note);
        const prev = typeof user.note === 'string' ? user.note.trim() : '';
        if (prev === next) {
          return ok({ note: next });
        }
        const { data: updated, errors } = await client.models.User.update({
          id: user.id,
          note: next,
        });
        if (errors?.length || !updated) {
          fail('SAVE_FAILED', errors?.[0]?.message || 'note update failed');
        }
        const message = next
          ? `${user.name}さんの備考が変更されました。`
          : `${user.name}さんの備考が削除されました。`;
        await client.models.History.create({
          userId: user.id,
          userName: user.name,
          message,
          isProcessed: false,
          groupId,
          recordedAt: new Date().toISOString(),
        });
        return ok({ note: next });
      }
      case 'saveUser': {
        requireAdmin(session);
        const groupId = await effectiveGroupId(session, payload.groupId);
        const name = requireId(payload.name, 'name').trim();
        const usersInGroup = await getUsers(session, { groupId });
        if (payload.id && usersInGroup.some((u: any) => u.id === payload.id)) {
          const existing = usersInGroup.find((u: any) => u.id === payload.id);
          const prevName = existing?.name || '';
          await client.models.User.update({
            id: payload.id,
            name,
            groupId,
          });
          // 履歴は作成時の userName を持つため、改名時は同一 userId の表示名を揃える
          if (prevName && prevName !== name) {
            const { data: histories } = await client.models.History.listHistoriesByGroup(
              { groupId },
              { sortDirection: 'DESC', limit: 500 }
            );
            await Promise.all(
              histories
                .filter((h) => h.userId === payload.id && h.userName !== name)
                .map((h) =>
                  client.models.History.update({
                    id: h.id,
                    userName: name,
                  })
                )
            );
          }
        } else {
          await client.models.User.create({
            name,
            order: usersInGroup.length,
            groupId,
          });
        }
        return ok(true);
      }
      case 'saveUsers': {
        requireAdmin(session);
        const users = payload.users as Array<{ id: string; name: string; groupId: string }>;
        await Promise.all(
          users.map((u, index) =>
            client.models.User.update({
              id: u.id,
              name: u.name,
              order: index,
              groupId: requireId(u.groupId, 'groupId'),
            })
          )
        );
        return ok(true);
      }
      case 'moveUserToGroup': {
        requireAdmin(session);
        const targetGroupId = requireId(payload.targetGroupId, 'targetGroupId');
        await assertGroupExists(targetGroupId);
        const user = (await client.models.User.get({ id: payload.userId })).data;
        if (!user) fail('NOT_FOUND', 'user');
        const targetUsers = await getUsers(session, { groupId: targetGroupId });
        await client.models.User.update({
          id: payload.userId,
          groupId: targetGroupId,
          order: targetUsers.length,
        });
        await moveHistoriesForUsers([payload.userId], targetGroupId);
        return ok(true);
      }
      case 'deleteUser': {
        requireAdmin(session);
        await client.models.User.delete({ id: payload.id });
        const { data: schedules } = await client.models.Schedule.list({
          filter: { userId: { eq: payload.id } },
          limit: 400,
        });
        await Promise.all(
          schedules.map((s) =>
            client.models.Schedule.delete({ userId: s.userId, date: s.date })
          )
        );
        return ok(true);
      }
      case 'getSchedulesForMonth': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        const userIds = (payload.userIds as string[]) || [];
        for (const userId of userIds) {
          await assertUserInGroup(userId, groupId);
        }
        const { start, end } = monthBounds(payload.year, payload.month);
        const pages = await Promise.all(
          userIds.map(async (userId) => {
            const { data } = await client.models.Schedule.list({
              filter: {
                and: [
                  { userId: { eq: userId } },
                  { date: { ge: start } },
                  { date: { le: end } },
                ],
              },
              limit: 40,
            });
            return data;
          })
        );
        return ok(
          pages.flat().map((s) => ({
            userId: s.userId,
            date: s.date,
            status: s.status,
          }))
        );
      }
      case 'getSchedulesForUser': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        await assertUserInGroup(payload.userId, groupId);
        const { data } = await client.models.Schedule.list({
          filter: { userId: { eq: payload.userId } },
          limit: 200,
        });
        return ok(
          data.map((s) => ({
            userId: s.userId,
            date: s.date,
            status: s.status,
          }))
        );
      }
      case 'updateSchedules': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        const group = await assertGroupExists(groupId);
        const updates = (payload.updates as Array<{ userId: string; date: string; status: string }>) || [];
        for (const update of updates) {
          await assertUserInGroup(update.userId, groupId);
          if (!isStatusAllowed(group, update.status)) {
            fail('INVALID_STATUS', update.status);
          }
          const existing = await client.models.Schedule.get({
            userId: update.userId,
            date: update.date,
          });
          if (existing.data) {
            await client.models.Schedule.update({
              userId: update.userId,
              date: update.date,
              status: update.status,
            });
          } else {
            await client.models.Schedule.create({
              userId: update.userId,
              date: update.date,
              status: update.status,
            });
          }
        }
        return ok(true);
      }
      case 'getHistories': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        const includeProcessed = !!payload.includeProcessed;
        const limit = payload.limit ?? (includeProcessed ? 100 : 80);
        const { data } = await client.models.History.listHistoriesByGroup(
          { groupId },
          { sortDirection: 'DESC', limit }
        );
        const mapped = data.map((h) => ({
          id: h.id,
          userId: h.userId,
          userName: h.userName,
          message: h.message,
          isProcessed: h.isProcessed,
          createdAt: h.createdAt,
          groupId: h.groupId || groupId,
          recordedAt: h.recordedAt ?? h.createdAt,
        }));
        return ok(includeProcessed ? mapped : mapped.filter((h) => !h.isProcessed));
      }
      case 'getUnprocessedHistoryCounts': {
        requireAdmin(session);
        const groupList = await listGroupsSorted();
        const counts: Record<string, number> = {};
        await Promise.all(
          groupList.map(async (g) => {
            const { data } = await client.models.History.listHistoriesByGroup(
              { groupId: g.id },
              { sortDirection: 'DESC', limit: 200 }
            );
            counts[g.id] = data.filter((h) => !h.isProcessed).length;
          })
        );
        return ok(counts);
      }
      case 'addHistory': {
        const groupId = await effectiveGroupId(session, payload.groupId);
        if (session.role === 'GENERAL' && payload.groupId && payload.groupId !== groupId) {
          fail('FORBIDDEN');
        }
        const recordedAt = payload.recordedAt || new Date().toISOString();
        await client.models.History.create({
          userId: payload.userId,
          userName: payload.userName,
          message: payload.message,
          isProcessed: !!payload.isProcessed,
          groupId,
          recordedAt,
        });
        return ok(true);
      }
      case 'updateHistoryStatus': {
        requireAdmin(session);
        await client.models.History.update({
          id: payload.id,
          isProcessed: !!payload.isProcessed,
        });
        return ok(true);
      }
      case 'listAccessLinks': {
        requireAdmin(session);
        const { data } = await client.models.AccessLink.list({ limit: 100 });
        return ok(
          data
            .filter((l) => l.role)
            .map((l) =>
              l.role === 'GENERAL'
                ? { id: l.id, role: 'GENERAL', groupId: l.groupId || undefined }
                : { id: l.id, role: 'ADMIN' }
            )
        );
      }
      case 'reissueAccessLink': {
        requireAdmin(session);
        const config = (await client.models.Config.get({ id: 'system' })).data as any;
        if (!config?.reissuePassword || config.reissuePassword !== payload.password) {
          fail('INVALID_REISSUE_PASSWORD');
        }
        const { data: links } = await client.models.AccessLink.list({ limit: 100 });
        const role = payload.role as Role;
        const target = links.find((l) => {
          if (role === 'ADMIN') return l.role === 'ADMIN';
          return l.role === 'GENERAL' && l.groupId === payload.groupId;
        });
        if (target) {
          await client.models.AccessLink.delete({ id: target.id });
        }
        const newId = crypto.randomUUID();
        if (role === 'ADMIN') {
          await client.models.AccessLink.create({ id: newId, role: 'ADMIN' });
          return ok({ id: newId, role: 'ADMIN' });
        }
        const groupId = requireId(payload.groupId, 'groupId');
        await assertGroupExists(groupId);
        await client.models.AccessLink.create({ id: newId, role: 'GENERAL', groupId });
        return ok({ id: newId, role: 'GENERAL', groupId });
      }
      default:
        fail('UNKNOWN_ACTION', action);
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.startsWith('{')) throw e;
    throw new Error(JSON.stringify({ ok: false, code: 'INTERNAL', message: msg }));
  }
};
