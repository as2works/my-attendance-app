import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { appApi } from '../functions/app-api/resource';

/**
 * モデルは API Key に対して操作を一切許可しない（to([])）。
 * Lambda（appApi）だけ allow.resource で読み書きする。
 * ブラウザは invokeAppApi mutation 経由のみ。
 *
 * 階層: OWNER ポータル → Workspace（箱）→ Group → User/Schedule/History
 */
const schema = a.schema({
  Workspace: a
    .model({
      id: a.string().required(),
      name: a.string().required(),
      /** 箱のメモ（空可） */
      note: a.string(),
      order: a.integer().default(0),
    })
    .identifier(['id']),

  Group: a
    .model({
      id: a.string().required(),
      name: a.string().required(),
      /** true のとき in/out（入寮・退寮）記号を使える */
      hasLodgingStatuses: a.boolean().default(false),
      order: a.integer().default(0),
      workspaceId: a.id(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('workspaceId').sortKeys(['order']).queryField('listGroupsByWorkspace'),
    ]),

  AccessLink: a.model({
    role: a.enum(['OWNER', 'ADMIN', 'GENERAL']),
    workspaceId: a.id(),
    groupId: a.id(),
  }),

  User: a
    .model({
      name: a.string().required(),
      order: a.integer().default(0),
      groupId: a.id(),
      workspaceId: a.id(),
      /** 出勤・給与など外部システム連携用のユーザID（内部UUIDとは別） */
      employeeId: a.string(),
      /** 月非依存の個人備考（最大300字想定、アプリ側で制限） */
      note: a.string(),
    })
    .secondaryIndexes((index) => [
      index('groupId').sortKeys(['order']).queryField('listUsersByGroup'),
      index('workspaceId').sortKeys(['order']).queryField('listUsersByWorkspace'),
    ]),

  Schedule: a
    .model({
      userId: a.id().required(),
      date: a.date().required(),
      status: a.string().required(),
    })
    .identifier(['userId', 'date']),

  History: a
    .model({
      userId: a.id().required(),
      userName: a.string().required(),
      message: a.string().required(),
      isProcessed: a.boolean().required(),
      groupId: a.id(),
      workspaceId: a.id(),
      recordedAt: a.string(),
    })
    .secondaryIndexes((index) => [
      index('groupId').sortKeys(['recordedAt']).queryField('listHistoriesByGroup'),
    ]),

  /** id は workspaceId（箱ごと）。ポータル用は id = '_portal' */
  Config: a
    .model({
      id: a.string().required(),
      seasonStartDate: a.date().required(),
      seasonEndDate: a.date().required(),
      /** 事業休日 YYYY-MM-DD の JSON 配列文字列 */
      holidaysJson: a.string(),
      reissuePassword: a.string(),
      seedVersion: a.integer(),
      /** ユーザID列を画面表示するか（未設定は true） */
      showEmployeeId: a.boolean(),
    })
    .identifier(['id']),

  invokeAppApi: a
    .mutation()
    .arguments({
      token: a.string(),
      action: a.string().required(),
      payload: a.string(),
    })
    .returns(a.string().required())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(appApi)),
}).authorization((allow) => [
  allow.resource(appApi),
  allow.publicApiKey().to([]),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 364,
    },
  },
});
