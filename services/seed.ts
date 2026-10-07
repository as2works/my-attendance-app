
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import { GROUP_IDS } from '../types';

const client = generateClient<Schema>();


const GROUPS: { id: string; name: string }[] = [
  { id: GROUP_IDS.DORM, name: '寮' },
  { id: GROUP_IDS.HOME, name: '自宅' },
];

let seedPromise: Promise<void> | null = null;

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

async function listAllUsers() {
  const users: Array<{ id: string; groupId?: string | null }> = [];
  let nextToken: string | undefined;
  do {
    const result = await client.models.User.list({
      limit: 100,
      ...(nextToken ? { nextToken } : {}),
    });
    users.push(...result.data);
    nextToken = result.nextToken ?? undefined;
  } while (nextToken);
  return users;
}

async function listAllHistories() {
  const histories: Array<{
    id: string;
    groupId?: string | null;
    createdAt?: string | null;
    recordedAt?: string | null;
  }> = [];
  let nextToken: string | undefined;
  do {
    const result = await client.models.History.list({
      limit: 100,
      ...(nextToken ? { nextToken } : {}),
    });
    histories.push(...result.data);
    nextToken = result.nextToken ?? undefined;
  } while (nextToken);
  return histories;
}

async function ensureGroups() {
  for (const group of GROUPS) {
    const existing = await client.models.Group.get({ id: group.id });
    if (!existing.data) {
      await client.models.Group.create({ id: group.id, name: group.name });
    }
  }
}

async function ensureAccessLinks() {
  const { data: links } = await client.models.AccessLink.list({ limit: 100 });

  const hasAdmin = links.some((link) => link.role === 'ADMIN');
  const hasDorm = links.some(
    (link) => link.role === 'GENERAL' && link.groupId === GROUP_IDS.DORM
  );
  const hasHome = links.some(
    (link) => link.role === 'GENERAL' && link.groupId === GROUP_IDS.HOME
  );

  if (!hasAdmin) {
    await client.models.AccessLink.create({
      id: crypto.randomUUID(),
      role: 'ADMIN',
    });
  }
  if (!hasDorm) {
    await client.models.AccessLink.create({
      id: crypto.randomUUID(),
      role: 'GENERAL',
      groupId: GROUP_IDS.DORM,
    });
  }
  if (!hasHome) {
    await client.models.AccessLink.create({
      id: crypto.randomUUID(),
      role: 'GENERAL',
      groupId: GROUP_IDS.HOME,
    });
  }
}

async function ensureReissuePassword() {
  const response = await client.models.Config.get({ id: 'system' });
  const config = response.data as { id?: string; reissuePassword?: string | null } | null;
  if (!config) {
    return;
  }
  if (!config.reissuePassword) {
    await client.models.Config.update({
      id: 'system',
      reissuePassword: randomPassword(),
    });
  }
}

async function migrateUsersToDorm() {
  const users = await listAllUsers();
  await Promise.all(
    users
      .filter((user) => !user.groupId)
      .map((user) =>
        client.models.User.update({
          id: user.id,
          groupId: GROUP_IDS.DORM,
        })
      )
  );
}

async function migrateHistoriesToDorm() {
  const histories = await listAllHistories();
  await Promise.all(
    histories
      .filter((history) => !history.groupId)
      .map((history) =>
        client.models.History.update({
          id: history.id,
          groupId: GROUP_IDS.DORM,
          recordedAt: history.recordedAt || history.createdAt || new Date().toISOString(),
        })
      )
  );
}

async function runSeed() {
  // 入場キーとグループは毎回不足分だけ補完（seedVersion 済みでも欠けると入れなくなるため）
  await ensureGroups();
  await ensureAccessLinks();
  await ensureReissuePassword();

  const response = await client.models.Config.get({ id: 'system' });
  const config = response.data as { seedVersion?: number | null } | null;
  if (config?.seedVersion && config.seedVersion >= 1) {
    return;
  }

  await migrateUsersToDorm();
  await migrateHistoriesToDorm();

  if (config) {
    await client.models.Config.update({
      id: 'system',
      seedVersion: 1,
    });
  }
}

export async function ensureBackendSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}
