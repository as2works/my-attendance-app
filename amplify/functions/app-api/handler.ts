import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/app-api';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

type Role = 'ADMIN' | 'GENERAL';
type GroupId = 'dorm' | 'home';
type Session = { linkId: string; role: Role; groupId?: GroupId };

type Args = {
  token?: string | null;
  action: string;
  payload?: string | null;
};

const GROUP_IDS = { DORM: 'dorm' as const, HOME: 'home' as const };
const DORM_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', 'in', 'out', '-']);
const HOME_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', '-']);

function asGroupId(value: string | null | undefined): GroupId {
  return value === GROUP_IDS.HOME ? GROUP_IDS.HOME : GROUP_IDS.DORM;
}

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

function isStatusAllowed(groupId: GroupId, status: string) {
  return (groupId === GROUP_IDS.DORM ? DORM_STATUSES : HOME_STATUSES).has(status);
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
  return { linkId: data.id, role: 'GENERAL', groupId: asGroupId(data.groupId) };
}

function requireAdmin(session: Session) {
  if (session.role !== 'ADMIN') fail('FORBIDDEN');
}

function effectiveGroupId(session: Session, requested?: string): GroupId {
  if (session.role === 'GENERAL') {
    return session.groupId || GROUP_IDS.DORM;
  }
  return asGroupId(requested);
}

async function ensureSeed() {
  const groups = [
    { id: GROUP_IDS.DORM, name: '寮' },
    { id: GROUP_IDS.HOME, name: '自宅' },
  ];
  for (const g of groups) {
    const existing = await client.models.Group.get({ id: g.id });
    if (!existing.data) {
      await client.models.Group.create({ id: g.id, name: g.name });
    }
  }

  const { data: links } = await client.models.AccessLink.list({ limit: 100 });
  const hasAdmin = links.some((l) => l.role === 'ADMIN');
  const hasDorm = links.some((l) => l.role === 'GENERAL' && l.groupId === GROUP_IDS.DORM);
  const hasHome = links.some((l) => l.role === 'GENERAL' && l.groupId === GROUP_IDS.HOME);

  const created: string[] = [];
  if (!hasAdmin) {
    const id = crypto.randomUUID();
    await client.models.AccessLink.create({ id, role: 'ADMIN' });
    created.push(`ADMIN=${id}`);
  }
  if (!hasDorm) {
    const id = crypto.randomUUID();
    await client.models.AccessLink.create({ id, role: 'GENERAL', groupId: GROUP_IDS.DORM });
    created.push(`DORM=${id}`);
  }
  if (!hasHome) {
    const id = crypto.randomUUID();
    await client.models.AccessLink.create({ id, role: 'GENERAL', groupId: GROUP_IDS.HOME });
    created.push(`HOME=${id}`);
  }
  if (created.length) {
    console.info('[AccessLinks created]', created.join(', '));
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
        .map((u) => client.models.User.update({ id: u.id, groupId: GROUP_IDS.DORM }))
    );
    const { data: histories } = await client.models.History.list({ limit: 200 });
    await Promise.all(
      histories
        .filter((h) => !h.groupId)
        .map((h) =>
          client.models.History.update({
            id: h.id,
            groupId: GROUP_IDS.DORM,
            recordedAt: h.recordedAt || h.createdAt || new Date().toISOString(),
          })
        )
    );
    await client.models.Config.update({ id: 'system', seedVersion: 1 });
  }

  return { ready: true };
}

async function getUsers(session: Session, payload: any) {
  const groupId = effectiveGroupId(session, payload.groupId);
  const { data: users } = await client.models.User.listUsersByGroup(
    { groupId },
    { sortDirection: 'ASC', limit: 200 }
  );
  return users.map((u) => ({ id: u.id, name: u.name, groupId: asGroupId(u.groupId) }));
}

async function assertUserInGroup(userId: string, groupId: GroupId) {
  const { data } = await client.models.User.get({ id: userId });
  if (!data || asGroupId(data.groupId) !== groupId) fail('FORBIDDEN', 'user not in group');
  return data;
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
        });
      }
      case 'saveConfig': {
        requireAdmin(session);
        await client.models.Config.update({
          id: 'system',
          seasonStartDate: payload.seasonStartDate,
          seasonEndDate: payload.seasonEndDate,
        });
        return ok(true);
      }
      case 'getUsers': {
        return ok(await getUsers(session, payload));
      }
      case 'saveUser': {
        requireAdmin(session);
        const groupId = effectiveGroupId(session, payload.groupId);
        const usersInGroup = await getUsers(session, { groupId });
        if (payload.id && usersInGroup.some((u: any) => u.id === payload.id)) {
          await client.models.User.update({
            id: payload.id,
            name: payload.name,
            groupId,
          });
        } else {
          await client.models.User.create({
            name: payload.name,
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
              groupId: asGroupId(u.groupId),
            })
          )
        );
        return ok(true);
      }
      case 'moveUserToGroup': {
        requireAdmin(session);
        const targetGroupId = asGroupId(payload.targetGroupId);
        const targetUsers = await getUsers(session, { groupId: targetGroupId });
        await client.models.User.update({
          id: payload.userId,
          groupId: targetGroupId,
          order: targetUsers.length,
        });
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
        const groupId = effectiveGroupId(session, payload.groupId);
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
        const groupId = effectiveGroupId(session, payload.groupId);
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
        const groupId = effectiveGroupId(session, payload.groupId);
        const updates = (payload.updates as Array<{ userId: string; date: string; status: string }>) || [];
        for (const update of updates) {
          await assertUserInGroup(update.userId, groupId);
          if (!isStatusAllowed(groupId, update.status)) {
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
        const groupId = effectiveGroupId(session, payload.groupId);
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
          groupId: asGroupId(h.groupId),
          recordedAt: h.recordedAt ?? h.createdAt,
        }));
        return ok(includeProcessed ? mapped : mapped.filter((h) => !h.isProcessed));
      }
      case 'addHistory': {
        const groupId = effectiveGroupId(session, payload.groupId);
        if (session.role === 'GENERAL' && payload.groupId && asGroupId(payload.groupId) !== groupId) {
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
        const { data } = await client.models.AccessLink.list({ limit: 20 });
        return ok(
          data
            .filter((l) => l.role)
            .map((l) =>
              l.role === 'GENERAL'
                ? { id: l.id, role: 'GENERAL', groupId: asGroupId(l.groupId) }
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
        const { data: links } = await client.models.AccessLink.list({ limit: 20 });
        const role = payload.role as Role;
        const target = links.find((l) => {
          if (role === 'ADMIN') return l.role === 'ADMIN';
          return l.role === 'GENERAL' && asGroupId(l.groupId) === asGroupId(payload.groupId);
        });
        if (target) {
          await client.models.AccessLink.delete({ id: target.id });
        }
        const newId = crypto.randomUUID();
        if (role === 'ADMIN') {
          await client.models.AccessLink.create({ id: newId, role: 'ADMIN' });
          return ok({ id: newId, role: 'ADMIN' });
        }
        const groupId = asGroupId(payload.groupId);
        await client.models.AccessLink.create({ id: newId, role: 'GENERAL', groupId });
        return ok({ id: newId, role: 'GENERAL', groupId });
      }
      default:
        fail('UNKNOWN_ACTION', action);
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    // AppSync にそのまま伝わるように Error を投げ直す
    if (msg.startsWith('{')) throw e;
    throw new Error(JSON.stringify({ ok: false, code: 'INTERNAL', message: msg }));
  }
};
