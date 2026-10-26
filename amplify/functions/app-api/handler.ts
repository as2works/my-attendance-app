import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/app-api';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

type Role = 'OWNER' | 'ADMIN' | 'GENERAL';
type GroupId = string;
type WorkspaceId = string;
type Session = {
  linkId: string;
  role: Role;
  workspaceId?: WorkspaceId;
  groupId?: GroupId;
};

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
  workspaceId: string;
};

type WorkspaceRecord = {
  id: string;
  name: string;
  note: string;
  order: number;
};

const DEFAULT_WORKSPACE_ID = 'default';
const PORTAL_CONFIG_ID = '_portal';
const DEFAULT_GROUP_IDS = { DORM: 'dorm', HOME: 'home' } as const;
const BASE_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', '-']);
const LODGING_STATUSES = new Set(['〇', '×', '△', 'AM', 'PM', 'in', 'out', '-']);
const USER_NOTE_MAX_LENGTH = 300;
const WORKSPACE_NOTE_MAX_LENGTH = 300;

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

function normalizeNote(raw: unknown, max = USER_NOTE_MAX_LENGTH): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n/g, '\n').trim().slice(0, max);
}

function randomPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    (b % 36).toString(36)
  ).join('');
}

function mapGroup(g: any): GroupRecord {
  return {
    id: g.id,
    name: g.name || g.id,
    hasLodgingStatuses: !!g.hasLodgingStatuses,
    order: typeof g.order === 'number' ? g.order : 0,
    workspaceId: g.workspaceId || DEFAULT_WORKSPACE_ID,
  };
}

function mapWorkspace(w: any): WorkspaceRecord {
  return {
    id: w.id,
    name: w.name || w.id,
    note: typeof w.note === 'string' ? w.note : '',
    order: typeof w.order === 'number' ? w.order : 0,
  };
}

function showEmployeeIdFromConfig(config: any): boolean {
  return config?.showEmployeeId !== false;
}

function mapConfig(config: any, workspaceId: string) {
  return {
    id: workspaceId,
    seasonStartDate: config.seasonStartDate,
    seasonEndDate: config.seasonEndDate,
    holidays: parseHolidays(config.holidaysJson ?? config.holidays),
    showEmployeeId: showEmployeeIdFromConfig(config),
  };
}

async function listWorkspacesSorted(): Promise<WorkspaceRecord[]> {
  const { data } = await client.models.Workspace.list({ limit: 100 });
  return data.map(mapWorkspace).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
}

async function listGroupsInWorkspace(workspaceId: string): Promise<GroupRecord[]> {
  const { data } = await client.models.Group.listGroupsByWorkspace(
    { workspaceId },
    { sortDirection: 'ASC', limit: 100 }
  );
  if (data.length) {
    return data.map(mapGroup);
  }
  // 移行直後で GSI が空の場合のフォールバック
  const all = await client.models.Group.list({ limit: 100 });
  return all.data
    .filter((g) => (g.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId)
    .map(mapGroup)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
}

async function assertWorkspaceExists(workspaceId: string): Promise<WorkspaceRecord> {
  const { data } = await client.models.Workspace.get({ id: workspaceId });
  if (!data) fail('NOT_FOUND', 'workspace');
  return mapWorkspace(data);
}

async function assertGroupInWorkspace(groupId: string, workspaceId: string): Promise<GroupRecord> {
  const { data } = await client.models.Group.get({ id: groupId });
  if (!data) fail('NOT_FOUND', 'group');
  const group = mapGroup(data);
  if (group.workspaceId !== workspaceId) fail('FORBIDDEN', 'group not in workspace');
  return group;
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
  if (data.role === 'OWNER') {
    return { linkId: data.id, role: 'OWNER' };
  }
  if (data.role === 'ADMIN') {
    if (!data.workspaceId) fail('UNAUTHORIZED', 'admin missing workspace');
    return { linkId: data.id, role: 'ADMIN', workspaceId: data.workspaceId };
  }
  if (!data.groupId || !data.workspaceId) fail('UNAUTHORIZED', 'invalid general token');
  return {
    linkId: data.id,
    role: 'GENERAL',
    workspaceId: data.workspaceId,
    groupId: data.groupId,
  };
}

function requireOwner(session: Session) {
  if (session.role !== 'OWNER') fail('FORBIDDEN');
}

function requireAdmin(session: Session) {
  if (session.role !== 'ADMIN') fail('FORBIDDEN');
}

function requireWorkspaceSession(session: Session): WorkspaceId {
  if (session.role === 'OWNER') fail('FORBIDDEN', 'workspace required');
  if (!session.workspaceId) fail('UNAUTHORIZED', 'missing workspace');
  return session.workspaceId;
}

async function effectiveGroupId(session: Session, requested?: string): Promise<string> {
  const workspaceId = requireWorkspaceSession(session);
  if (session.role === 'GENERAL') {
    if (!session.groupId) fail('UNAUTHORIZED', 'invalid general token');
    return session.groupId;
  }
  if (requested) {
    await assertGroupInWorkspace(requested, workspaceId);
    return requested;
  }
  const groups = await listGroupsInWorkspace(workspaceId);
  if (!groups.length) fail('NOT_FOUND', 'no groups');
  return groups[0].id;
}

/** 本番（main/prod）では入場URL開示を禁止。sandbox 等のみ許可 */
function allowBootstrapLinkDisclose(): boolean {
  if (process.env.ALLOW_BOOTSTRAP_LINK_DISCLOSE === '0') return false;
  if (process.env.ALLOW_BOOTSTRAP_LINK_DISCLOSE === '1') return true;
  const branch = (process.env.AWS_BRANCH || '').toLowerCase();
  if (branch === 'main' || branch === 'master' || branch === 'prod' || branch === 'production') {
    return false;
  }
  // ブランチ未設定（典型的な sandbox）または sandbox を含む場合のみ
  return !branch || branch.includes('sandbox');
}

async function listAllAccessLinks(): Promise<
  Array<{ id: string; role?: string | null; workspaceId?: string | null; groupId?: string | null }>
> {
  return listAllByFilter((nextToken) =>
    client.models.AccessLink.list({
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
}

async function findAccessLinks(predicate: (l: {
  id: string;
  role?: string | null;
  workspaceId?: string | null;
  groupId?: string | null;
}) => boolean) {
  const links = await listAllAccessLinks();
  return links.filter(predicate);
}

async function deleteAccessLinksMatching(
  predicate: (l: {
    id: string;
    role?: string | null;
    workspaceId?: string | null;
    groupId?: string | null;
  }) => boolean
) {
  const targets = await findAccessLinks(predicate);
  await Promise.all(targets.map((l) => client.models.AccessLink.delete({ id: l.id })));
  return targets.length;
}

async function ensureGeneralLink(workspaceId: string, groupId: string) {
  const existing = await findAccessLinks(
    (l) => l.role === 'GENERAL' && l.groupId === groupId && l.workspaceId === workspaceId
  );
  if (existing.length) return;
  const id = crypto.randomUUID();
  await client.models.AccessLink.create({ id, role: 'GENERAL', workspaceId, groupId });
  console.info('[AccessLinks created]', `GENERAL(${groupId})=${id}`);
}

async function ensureAdminLink(workspaceId: string): Promise<string> {
  const existing = await findAccessLinks(
    (l) => l.role === 'ADMIN' && l.workspaceId === workspaceId
  );
  if (existing.length) return existing[0].id;
  const id = crypto.randomUUID();
  await client.models.AccessLink.create({ id, role: 'ADMIN', workspaceId });
  console.info('[AccessLinks created]', `ADMIN(${workspaceId})=${id}`);
  return id;
}

async function ensureOwnerLink(): Promise<string> {
  const existing = await findAccessLinks((l) => l.role === 'OWNER');
  if (existing.length) return existing[0].id;
  const id = crypto.randomUUID();
  await client.models.AccessLink.create({ id, role: 'OWNER' });
  console.info('[AccessLinks created]', `OWNER=${id}`);
  return id;
}

async function ensureWorkspaceConfig(workspaceId: string, seedFromSystem?: any) {
  const existing = (await client.models.Config.get({ id: workspaceId })).data as any;
  if (existing) {
    if (typeof existing.showEmployeeId !== 'boolean') {
      await client.models.Config.update({ id: workspaceId, showEmployeeId: true });
    }
    return;
  }
  await client.models.Config.create({
    id: workspaceId,
    seasonStartDate: seedFromSystem?.seasonStartDate || '2026-01-01',
    seasonEndDate: seedFromSystem?.seasonEndDate || '2026-03-31',
    holidaysJson: seedFromSystem?.holidaysJson || '[]',
    reissuePassword: seedFromSystem?.reissuePassword || randomPassword(),
    seedVersion: 3,
    showEmployeeId: true,
  });
}

async function createEmptyGroups(workspaceId: string, useLegacyIds: boolean) {
  const defaults = useLegacyIds
    ? [
        { id: DEFAULT_GROUP_IDS.DORM, name: '寮', hasLodgingStatuses: true, order: 0 },
        { id: DEFAULT_GROUP_IDS.HOME, name: '自宅', hasLodgingStatuses: false, order: 1 },
      ]
    : [
        { id: crypto.randomUUID(), name: '寮', hasLodgingStatuses: true, order: 0 },
        { id: crypto.randomUUID(), name: '自宅', hasLodgingStatuses: false, order: 1 },
      ];

  for (const g of defaults) {
    const existing = await client.models.Group.get({ id: g.id });
    if (!existing.data) {
      await client.models.Group.create({ ...g, workspaceId });
    } else if (!existing.data.workspaceId) {
      await client.models.Group.update({ id: g.id, workspaceId });
    }
    await ensureGeneralLink(workspaceId, g.id);
  }
}

async function ensureSeed(options?: { discloseBootstrapLinks?: boolean }) {
  const discloseBootstrapLinks = !!options?.discloseBootstrapLinks;
  const systemConfig = (await client.models.Config.get({ id: 'system' })).data as any;
  const portalConfig = (await client.models.Config.get({ id: PORTAL_CONFIG_ID })).data as any;

  let workspaces = await listWorkspacesSorted();
  if (!workspaces.length) {
    await client.models.Workspace.create({
      id: DEFAULT_WORKSPACE_ID,
      name: '既定',
      note: '',
      order: 0,
    });
    workspaces = await listWorkspacesSorted();
  }

  const defaultWs = workspaces.find((w) => w.id === DEFAULT_WORKSPACE_ID) || workspaces[0];

  // 旧 system Config → デフォルト箱 Config
  await ensureWorkspaceConfig(defaultWs.id, systemConfig);

  if (!portalConfig) {
    await client.models.Config.create({
      id: PORTAL_CONFIG_ID,
      seasonStartDate: '2026-01-01',
      seasonEndDate: '2026-03-31',
      holidaysJson: '[]',
      reissuePassword: randomPassword(),
      seedVersion: 3,
      showEmployeeId: true,
    });
  }

  // 既存グループ・リンク・ユーザー・履歴に workspaceId を付与
  const { data: allGroups } = await client.models.Group.list({ limit: 100 });
  if (!allGroups.length) {
    await createEmptyGroups(defaultWs.id, true);
  } else {
    for (const g of allGroups) {
      if (!g.workspaceId) {
        await client.models.Group.update({ id: g.id, workspaceId: defaultWs.id });
      }
    }
  }

  const { data: links } = await client.models.AccessLink.list({ limit: 300 });
  for (const l of links) {
    if (l.role === 'ADMIN' && !l.workspaceId) {
      await client.models.AccessLink.update({ id: l.id, workspaceId: defaultWs.id });
    }
    if (l.role === 'GENERAL' && l.groupId && !l.workspaceId) {
      const group = (await client.models.Group.get({ id: l.groupId })).data;
      const wsId = group?.workspaceId || defaultWs.id;
      await client.models.AccessLink.update({ id: l.id, workspaceId: wsId });
    }
  }

  const { data: users } = await client.models.User.list({ limit: 500 });
  for (const u of users) {
    if (!u.workspaceId) {
      let wsId = defaultWs.id;
      if (u.groupId) {
        const g = (await client.models.Group.get({ id: u.groupId })).data;
        if (g?.workspaceId) wsId = g.workspaceId;
      }
      await client.models.User.update({
        id: u.id,
        workspaceId: wsId,
        groupId: u.groupId || DEFAULT_GROUP_IDS.DORM,
      });
    }
  }

  const { data: histories } = await client.models.History.list({ limit: 500 });
  for (const h of histories) {
    if (!h.workspaceId) {
      let wsId = defaultWs.id;
      if (h.groupId) {
        const g = (await client.models.Group.get({ id: h.groupId })).data;
        if (g?.workspaceId) wsId = g.workspaceId;
      }
      await client.models.History.update({
        id: h.id,
        workspaceId: wsId,
        groupId: h.groupId || DEFAULT_GROUP_IDS.DORM,
        recordedAt: h.recordedAt || h.createdAt || new Date().toISOString(),
      });
    }
  }

  // 各箱の ADMIN / GENERAL / Config
  workspaces = await listWorkspacesSorted();
  for (const ws of workspaces) {
    await ensureWorkspaceConfig(ws.id, ws.id === defaultWs.id ? systemConfig : undefined);
    await ensureAdminLink(ws.id);
    const groups = await listGroupsInWorkspace(ws.id);
    if (!groups.length && ws.id === defaultWs.id) {
      await createEmptyGroups(ws.id, true);
    }
    for (const g of await listGroupsInWorkspace(ws.id)) {
      await ensureGeneralLink(ws.id, g.id);
    }
  }

  const ownerId = await ensureOwnerLink();
  const defaultAdminId = await findAdminLinkId(defaultWs.id);
  console.info('[Portal OWNER URL id]', ownerId);
  if (defaultAdminId) {
    console.info('[Default ADMIN URL id]', defaultAdminId);
  }

  // 旧 seedVersion 更新（互換）
  if (systemConfig && (!systemConfig.seedVersion || systemConfig.seedVersion < 3)) {
    await client.models.Config.update({ id: 'system', seedVersion: 3 });
  }

  // linkId 開示: クライアントが要求し、かつ sandbox 等でのみ（本番 Lambda では返さない）
  const disclose =
    discloseBootstrapLinks && allowBootstrapLinkDisclose();
  return {
    ready: true,
    defaultWorkspaceId: defaultWs.id,
    ...(disclose
      ? { ownerLinkId: ownerId, defaultAdminLinkId: defaultAdminId }
      : {}),
  };
}

function normalizeEmployeeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function assertEmployeeIdAvailable(
  workspaceId: string,
  employeeId: string,
  exceptUserId?: string
) {
  if (!employeeId) return;
  let pool = await listAllByFilter((nextToken) =>
    client.models.User.listUsersByWorkspace(
      { workspaceId },
      { limit: 200, ...(nextToken ? { nextToken } : {}) }
    ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  if (!pool.length) {
    pool = (
      await listAllByFilter((nextToken) =>
        client.models.User.list({
          filter: { workspaceId: { eq: workspaceId } },
          limit: 200,
          ...(nextToken ? { nextToken } : {}),
        }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
      )
    ) as typeof pool;
  }
  const dup = pool.find(
    (u) => normalizeEmployeeId(u.employeeId) === employeeId && u.id !== exceptUserId
  );
  if (dup) fail('DUPLICATE_EMPLOYEE_ID', employeeId);
}

async function getUsers(session: Session, payload: any) {
  const workspaceId = requireWorkspaceSession(session);
  const groupId = await effectiveGroupId(session, payload.groupId);
  const users = await listAllByFilter((nextToken) =>
    client.models.User.listUsersByGroup(
      { groupId },
      { sortDirection: 'ASC', limit: 200, ...(nextToken ? { nextToken } : {}) }
    ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    groupId: u.groupId || groupId,
    employeeId: normalizeEmployeeId(u.employeeId),
    note: typeof u.note === 'string' ? u.note : '',
    workspaceId: u.workspaceId || workspaceId,
  }));
}

async function assertUserInGroup(userId: string, groupId: GroupId) {
  const { data } = await client.models.User.get({ id: userId });
  if (!data || data.groupId !== groupId) fail('FORBIDDEN', 'user not in group');
  return data;
}

async function moveHistoriesForUsers(
  userIds: string[],
  targetGroupId: string,
  targetWorkspaceId: string
) {
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
          workspaceId: targetWorkspaceId,
          recordedAt: h.recordedAt || h.createdAt || new Date().toISOString(),
        })
      )
    );
  }
}

async function deleteGeneralLinksForGroup(groupId: string) {
  await deleteAccessLinksMatching((l) => l.role === 'GENERAL' && l.groupId === groupId);
}

async function findAdminLinkId(workspaceId: string): Promise<string | null> {
  const found = await findAccessLinks(
    (l) => l.role === 'ADMIN' && l.workspaceId === workspaceId
  );
  return found[0]?.id || null;
}

async function countUsersInWorkspace(workspaceId: string): Promise<number> {
  const byWs = await listAllByFilter((nextToken) =>
    client.models.User.listUsersByWorkspace(
      { workspaceId },
      { limit: 200, ...(nextToken ? { nextToken } : {}) }
    ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  if (byWs.length) return byWs.length;
  const all = await listAllByFilter((nextToken) =>
    client.models.User.list({
      filter: { workspaceId: { eq: workspaceId } },
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  return all.length;
}

async function buildWorkspaceListItem(ws: WorkspaceRecord) {
  const config = (await client.models.Config.get({ id: ws.id })).data as any;
  const groups = await listGroupsInWorkspace(ws.id);
  const userCount = await countUsersInWorkspace(ws.id);
  const adminLinkId = await findAdminLinkId(ws.id);
  return {
    id: ws.id,
    name: ws.name,
    note: ws.note,
    order: ws.order,
    seasonStartDate: config?.seasonStartDate || '',
    seasonEndDate: config?.seasonEndDate || '',
    groupCount: groups.length,
    userCount,
    adminLinkId,
    createdAt: undefined as string | undefined,
  };
}

async function listAllByFilter<T>(
  fetchPage: (nextToken?: string) => Promise<{ data: T[]; nextToken?: string | null }>
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | undefined;
  do {
    const page = await fetchPage(nextToken);
    all.push(...page.data);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);
  return all;
}

async function deleteSchedulesForUser(userId: string) {
  let nextToken: string | undefined;
  do {
    const page = await client.models.Schedule.list({
      filter: { userId: { eq: userId } },
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    });
    await Promise.all(
      page.data.map((s) => client.models.Schedule.delete({ userId: s.userId, date: s.date }))
    );
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);
}

async function deleteWorkspaceCascade(workspaceId: string) {
  // 利用者（GSI + workspaceId フィルタの取りこぼし対策で list も併用）
  const usersByWs = await listAllByFilter((nextToken) =>
    client.models.User.listUsersByWorkspace(
      { workspaceId },
      { limit: 200, ...(nextToken ? { nextToken } : {}) }
    ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  const usersFallback = await listAllByFilter((nextToken) =>
    client.models.User.list({
      filter: { workspaceId: { eq: workspaceId } },
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  const usersMap = new Map<string, { id: string }>();
  for (const u of [...usersByWs, ...usersFallback]) {
    if (u.id) usersMap.set(u.id, u);
  }
  for (const u of usersMap.values()) {
    await deleteSchedulesForUser(u.id);
    await client.models.User.delete({ id: u.id });
  }

  // 履歴
  const histories = await listAllByFilter((nextToken) =>
    client.models.History.list({
      filter: { workspaceId: { eq: workspaceId } },
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  await Promise.all(histories.map((h) => client.models.History.delete({ id: h.id })));

  // グループ（GSI + フォールバック）
  const groups = await listGroupsInWorkspace(workspaceId);
  for (const g of groups) {
    await deleteGeneralLinksForGroup(g.id);
    await client.models.Group.delete({ id: g.id });
  }

  // 入場リンク
  const links = await listAllByFilter((nextToken) =>
    client.models.AccessLink.list({
      filter: { workspaceId: { eq: workspaceId } },
      limit: 200,
      ...(nextToken ? { nextToken } : {}),
    }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
  );
  // filter が効かない環境向けフォールバック
  if (!links.length) {
    const allLinks = await listAllByFilter((nextToken) =>
      client.models.AccessLink.list({
        limit: 200,
        ...(nextToken ? { nextToken } : {}),
      }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
    );
    await Promise.all(
      allLinks
        .filter((l) => l.workspaceId === workspaceId)
        .map((l) => client.models.AccessLink.delete({ id: l.id }))
    );
  } else {
    await Promise.all(links.map((l) => client.models.AccessLink.delete({ id: l.id })));
  }

  const config = (await client.models.Config.get({ id: workspaceId })).data;
  if (config) {
    await client.models.Config.delete({ id: workspaceId });
  }
  await client.models.Workspace.delete({ id: workspaceId });
}

export const handler = async (event: { arguments: Args }) => {
  const { token, action, payload: payloadRaw } = event.arguments;
  const payload = parsePayload(payloadRaw);

  try {
    if (action === 'ensureSeed') {
      return ok(
        await ensureSeed({
          discloseBootstrapLinks: !!payload?.discloseBootstrapLinks,
        })
      );
    }

    if (action === 'resolveAccess') {
      const session = await resolveSession(token);
      return ok({
        id: session.linkId,
        role: session.role,
        workspaceId: session.workspaceId,
        groupId: session.groupId,
      });
    }

    const session = await resolveSession(token);

    switch (action) {
      case 'listWorkspaces': {
        requireOwner(session);
        await ensureSeed();
        const list = await listWorkspacesSorted();
        const items = await Promise.all(list.map(buildWorkspaceListItem));
        return ok(items);
      }
      case 'createWorkspace': {
        requireOwner(session);
        const name = requireId(payload.name, 'name');
        const note = normalizeNote(payload.note, WORKSPACE_NOTE_MAX_LENGTH);
        const existing = await listWorkspacesSorted();
        if (existing.some((w) => w.name === name)) fail('DUPLICATE_NAME', name);
        const id = crypto.randomUUID();
        const order = existing.length ? Math.max(...existing.map((w) => w.order)) + 1 : 0;
        const reissuePassword = randomPassword();
        await client.models.Workspace.create({ id, name, note, order });
        await client.models.Config.create({
          id,
          seasonStartDate: '2026-01-01',
          seasonEndDate: '2026-03-31',
          holidaysJson: '[]',
          reissuePassword,
          seedVersion: 3,
          showEmployeeId: true,
        });
        await ensureAdminLink(id);
        await createEmptyGroups(id, false);
        const item = await buildWorkspaceListItem(mapWorkspace({ id, name, note, order }));
        // 再発行パスワードはこのレスポンスでのみ返す（以降 GET では返さない）
        return ok({ ...item, reissuePassword });
      }
      case 'updateWorkspace': {
        requireOwner(session);
        const id = requireId(payload.id, 'id');
        await assertWorkspaceExists(id);
        const patch: { id: string; name?: string; note?: string } = { id };
        if (typeof payload.name === 'string' && payload.name.trim()) {
          const name = payload.name.trim();
          const all = await listWorkspacesSorted();
          if (all.some((w) => w.id !== id && w.name === name)) fail('DUPLICATE_NAME', name);
          patch.name = name;
        }
        if (typeof payload.note === 'string') {
          patch.note = normalizeNote(payload.note, WORKSPACE_NOTE_MAX_LENGTH);
        }
        await client.models.Workspace.update(patch);
        return ok(await buildWorkspaceListItem(await assertWorkspaceExists(id)));
      }
      case 'deleteWorkspace': {
        requireOwner(session);
        const id = requireId(payload.id, 'id');
        await assertWorkspaceExists(id);
        const all = await listWorkspacesSorted();
        if (all.length <= 1) fail('LAST_WORKSPACE', 'cannot delete last workspace');
        await deleteWorkspaceCascade(id);
        return ok(true);
      }
      case 'getPortalInfo': {
        requireOwner(session);
        return ok({ ownerLinkId: session.linkId });
      }
      case 'reissueWorkspaceAdminLink': {
        requireOwner(session);
        const workspaceId = requireId(payload.workspaceId, 'workspaceId');
        await assertWorkspaceExists(workspaceId);
        const config = (await client.models.Config.get({ id: workspaceId })).data as any;
        if (!config?.reissuePassword || config.reissuePassword !== payload.password) {
          fail('INVALID_REISSUE_PASSWORD');
        }
        await deleteAccessLinksMatching(
          (l) => l.role === 'ADMIN' && l.workspaceId === workspaceId
        );
        const newId = crypto.randomUUID();
        await client.models.AccessLink.create({ id: newId, role: 'ADMIN', workspaceId });
        return ok({ id: newId, role: 'ADMIN', workspaceId });
      }
      case 'rotateReissuePassword': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const config = (await client.models.Config.get({ id: workspaceId })).data as any;
        if (!config) fail('NOT_FOUND', 'config');
        if (!config.reissuePassword || config.reissuePassword !== payload.currentPassword) {
          fail('INVALID_REISSUE_PASSWORD');
        }
        const reissuePassword = randomPassword();
        await client.models.Config.update({ id: workspaceId, reissuePassword });
        return ok({ reissuePassword });
      }

      case 'getConfig': {
        const workspaceId = requireWorkspaceSession(session);
        await ensureSeed();
        const config = (await client.models.Config.get({ id: workspaceId })).data as any;
        if (!config) fail('NOT_FOUND', 'config');
        return ok(mapConfig(config, workspaceId));
      }
      case 'saveConfig': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const holidays = parseHolidays(payload.holidays);
        const patch: Record<string, unknown> = {
          id: workspaceId,
          seasonStartDate: payload.seasonStartDate,
          seasonEndDate: payload.seasonEndDate,
          holidaysJson: holidaysToJson(holidays),
        };
        if (typeof payload.showEmployeeId === 'boolean') {
          patch.showEmployeeId = payload.showEmployeeId;
        }
        const { data: updated, errors } = await client.models.Config.update(patch as any);
        if (errors?.length || !updated) {
          fail('SAVE_FAILED', errors?.[0]?.message || 'config update failed');
        }
        return ok(true);
      }
      case 'listGroups': {
        const workspaceId = requireWorkspaceSession(session);
        await ensureSeed();
        return ok(await listGroupsInWorkspace(workspaceId));
      }
      case 'createGroup': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const name = requireId(payload.name, 'name');
        const hasLodgingStatuses = !!payload.hasLodgingStatuses;
        const groups = await listGroupsInWorkspace(workspaceId);
        if (groups.some((g) => g.name === name)) fail('DUPLICATE_NAME', name);
        const id = crypto.randomUUID();
        const order = groups.length ? Math.max(...groups.map((g) => g.order)) + 1 : 0;
        await client.models.Group.create({ id, name, hasLodgingStatuses, order, workspaceId });
        await ensureGeneralLink(workspaceId, id);
        return ok({ id, name, hasLodgingStatuses, order, workspaceId });
      }
      case 'updateGroup': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const id = requireId(payload.id, 'id');
        await assertGroupInWorkspace(id, workspaceId);
        const patch: { id: string; name?: string; hasLodgingStatuses?: boolean } = { id };
        if (typeof payload.name === 'string' && payload.name.trim()) {
          const name = payload.name.trim();
          const groups = await listGroupsInWorkspace(workspaceId);
          if (groups.some((g) => g.id !== id && g.name === name)) fail('DUPLICATE_NAME', name);
          patch.name = name;
        }
        if (typeof payload.hasLodgingStatuses === 'boolean') {
          patch.hasLodgingStatuses = payload.hasLodgingStatuses;
        }
        await client.models.Group.update(patch);
        return ok(await assertGroupInWorkspace(id, workspaceId));
      }
      case 'reorderGroups': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
        if (!ids.length) fail('BAD_REQUEST', 'ids');
        for (const id of ids) {
          await assertGroupInWorkspace(id, workspaceId);
        }
        await Promise.all(
          ids.map((id, index) => client.models.Group.update({ id, order: index }))
        );
        return ok(await listGroupsInWorkspace(workspaceId));
      }
      case 'deleteGroup': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const sourceId = requireId(payload.id, 'id');
        const targetId = requireId(payload.targetGroupId, 'targetGroupId');
        if (sourceId === targetId) fail('BAD_REQUEST', 'same group');
        await assertGroupInWorkspace(sourceId, workspaceId);
        await assertGroupInWorkspace(targetId, workspaceId);
        const groups = await listGroupsInWorkspace(workspaceId);
        if (groups.length <= 1) fail('LAST_GROUP', 'cannot delete last group');

        const users = await listAllByFilter((nextToken) =>
          client.models.User.listUsersByGroup(
            { groupId: sourceId },
            { sortDirection: 'ASC', limit: 200, ...(nextToken ? { nextToken } : {}) }
          ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
        );
        const targetUsers = await listAllByFilter((nextToken) =>
          client.models.User.listUsersByGroup(
            { groupId: targetId },
            { sortDirection: 'ASC', limit: 200, ...(nextToken ? { nextToken } : {}) }
          ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
        );
        let order = targetUsers.length;
        const userIds = users.map((u) => u.id);
        for (const u of users) {
          await client.models.User.update({
            id: u.id,
            groupId: targetId,
            workspaceId,
            order: order++,
          });
        }
        await moveHistoriesForUsers(userIds, targetId, workspaceId);
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
        const workspaceId = requireWorkspaceSession(session);
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
          workspaceId,
          recordedAt: new Date().toISOString(),
        });
        return ok({ note: next });
      }
      case 'saveUser': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const groupId = await effectiveGroupId(session, payload.groupId);
        const name = requireId(payload.name, 'name').trim();
        const employeeId = normalizeEmployeeId(payload.employeeId);
        const usersInGroup = await getUsers(session, { groupId });
        if (payload.id) {
          const existing = usersInGroup.find((u: any) => u.id === payload.id);
          if (!existing) fail('NOT_FOUND', 'user');
          const prevName = existing.name || '';
          await assertEmployeeIdAvailable(workspaceId, employeeId, payload.id);
          await client.models.User.update({
            id: payload.id,
            name,
            employeeId,
            groupId,
            workspaceId,
          });
          if (prevName && prevName !== name) {
            const histories = await listAllByFilter((nextToken) =>
              client.models.History.listHistoriesByGroup(
                { groupId },
                { sortDirection: 'DESC', limit: 200, ...(nextToken ? { nextToken } : {}) }
              ).then((r) => ({ data: r.data, nextToken: r.nextToken }))
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
          await assertEmployeeIdAvailable(workspaceId, employeeId);
          await client.models.User.create({
            name,
            employeeId: employeeId || undefined,
            order: usersInGroup.length,
            groupId,
            workspaceId,
          });
        }
        return ok(true);
      }
      case 'saveUsers': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const users = payload.users as Array<{
          id: string;
          name: string;
          groupId: string;
          employeeId?: string;
        }>;
        const seenEmployeeIds = new Set<string>();
        for (const u of users) {
          await assertGroupInWorkspace(u.groupId, workspaceId);
          const existing = (await client.models.User.get({ id: u.id })).data;
          if (!existing) fail('NOT_FOUND', 'user');
          if ((existing.workspaceId || DEFAULT_WORKSPACE_ID) !== workspaceId) {
            fail('FORBIDDEN', 'user not in workspace');
          }
          const employeeId = normalizeEmployeeId(u.employeeId);
          if (employeeId) {
            const key = employeeId.toLocaleLowerCase('ja');
            if (seenEmployeeIds.has(key)) fail('DUPLICATE_EMPLOYEE_ID', employeeId);
            seenEmployeeIds.add(key);
          }
          await assertEmployeeIdAvailable(workspaceId, employeeId, u.id);
        }
        await Promise.all(
          users.map((u, index) =>
            client.models.User.update({
              id: u.id,
              name: u.name,
              order: index,
              groupId: requireId(u.groupId, 'groupId'),
              workspaceId,
              ...(typeof u.employeeId === 'string'
                ? { employeeId: normalizeEmployeeId(u.employeeId) }
                : {}),
            })
          )
        );
        return ok(true);
      }
      case 'moveUserToGroup': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const targetGroupId = requireId(payload.targetGroupId, 'targetGroupId');
        await assertGroupInWorkspace(targetGroupId, workspaceId);
        const user = (await client.models.User.get({ id: payload.userId })).data;
        if (!user) fail('NOT_FOUND', 'user');
        if ((user.workspaceId || DEFAULT_WORKSPACE_ID) !== workspaceId) {
          fail('FORBIDDEN', 'user not in workspace');
        }
        const targetUsers = await getUsers(session, { groupId: targetGroupId });
        await client.models.User.update({
          id: payload.userId,
          groupId: targetGroupId,
          workspaceId,
          order: targetUsers.length,
        });
        await moveHistoriesForUsers([payload.userId], targetGroupId, workspaceId);
        return ok(true);
      }
      case 'deleteUser': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const user = (await client.models.User.get({ id: payload.id })).data;
        if (!user) fail('NOT_FOUND', 'user');
        if ((user.workspaceId || DEFAULT_WORKSPACE_ID) !== workspaceId) {
          fail('FORBIDDEN', 'user not in workspace');
        }
        await deleteSchedulesForUser(payload.id);
        const histories = await listAllByFilter((nextToken) =>
          client.models.History.list({
            filter: { userId: { eq: payload.id } },
            limit: 200,
            ...(nextToken ? { nextToken } : {}),
          }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
        );
        await Promise.all(histories.map((h) => client.models.History.delete({ id: h.id })));
        await client.models.User.delete({ id: payload.id });
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
        const data = await listAllByFilter((nextToken) =>
          client.models.Schedule.list({
            filter: { userId: { eq: payload.userId } },
            limit: 200,
            ...(nextToken ? { nextToken } : {}),
          }).then((r) => ({ data: r.data, nextToken: r.nextToken }))
        );
        return ok(
          data.map((s) => ({
            userId: s.userId,
            date: s.date,
            status: s.status,
          }))
        );
      }
      case 'updateSchedules': {
        const workspaceId = requireWorkspaceSession(session);
        const groupId = await effectiveGroupId(session, payload.groupId);
        const group = await assertGroupInWorkspace(groupId, workspaceId);
        const updates =
          (payload.updates as Array<{ userId: string; date: string; status: string }>) || [];
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
        const workspaceId = requireWorkspaceSession(session);
        const groupList = await listGroupsInWorkspace(workspaceId);
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
        const workspaceId = requireWorkspaceSession(session);
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
          workspaceId,
          recordedAt,
        });
        return ok(true);
      }
      case 'updateHistoryStatus': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const history = (await client.models.History.get({ id: payload.id })).data;
        if (!history) fail('NOT_FOUND', 'history');
        if ((history.workspaceId || DEFAULT_WORKSPACE_ID) !== workspaceId) {
          fail('FORBIDDEN', 'history not in workspace');
        }
        await client.models.History.update({
          id: payload.id,
          isProcessed: !!payload.isProcessed,
        });
        return ok(true);
      }
      case 'listAccessLinks': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const data = await findAccessLinks((l) => !!l.role && l.workspaceId === workspaceId);
        return ok(
          data.map((l) =>
            l.role === 'GENERAL'
              ? { id: l.id, role: 'GENERAL', groupId: l.groupId || undefined, workspaceId }
              : { id: l.id, role: 'ADMIN', workspaceId }
          )
        );
      }
      case 'getWorkspaceMeta': {
        const workspaceId = requireWorkspaceSession(session);
        const ws = await assertWorkspaceExists(workspaceId);
        return ok({ id: ws.id, name: ws.name, note: ws.note });
      }
      case 'reissueAccessLink': {
        requireAdmin(session);
        const workspaceId = requireWorkspaceSession(session);
        const config = (await client.models.Config.get({ id: workspaceId })).data as any;
        if (!config?.reissuePassword || config.reissuePassword !== payload.password) {
          fail('INVALID_REISSUE_PASSWORD');
        }
        const role = payload.role as Role;
        if (role === 'OWNER') fail('FORBIDDEN');
        if (role === 'ADMIN') {
          await deleteAccessLinksMatching(
            (l) => l.role === 'ADMIN' && l.workspaceId === workspaceId
          );
          const newId = crypto.randomUUID();
          await client.models.AccessLink.create({ id: newId, role: 'ADMIN', workspaceId });
          return ok({ id: newId, role: 'ADMIN', workspaceId });
        }
        const groupId = requireId(payload.groupId, 'groupId');
        await assertGroupInWorkspace(groupId, workspaceId);
        await deleteAccessLinksMatching(
          (l) =>
            l.role === 'GENERAL' && l.groupId === groupId && l.workspaceId === workspaceId
        );
        const newId = crypto.randomUUID();
        await client.models.AccessLink.create({
          id: newId,
          role: 'GENERAL',
          workspaceId,
          groupId,
        });
        return ok({ id: newId, role: 'GENERAL', groupId, workspaceId });
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
