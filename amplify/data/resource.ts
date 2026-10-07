
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { appApi } from '../functions/app-api/resource';

/**
 * モデルは API Key に対して操作を一切許可しない（to([])）。
 * Lambda（appApi）だけ allow.resource で読み書きする。
 * ブラウザは invokeAppApi mutation 経由のみ。
 */
const schema = a.schema({
  Group: a.model({
    id: a.string().required(),
    name: a.string().required(),
  }).identifier(['id']),

  AccessLink: a.model({
    role: a.enum(['ADMIN', 'GENERAL']),
    groupId: a.id(),
  }),

  User: a.model({
    name: a.string().required(),
    order: a.integer().default(0),
    groupId: a.id(),
  }).secondaryIndexes((index) => [
    index('groupId').sortKeys(['order']).queryField('listUsersByGroup'),
  ]),

  Schedule: a.model({
    userId: a.id().required(),
    date: a.date().required(),
    status: a.string().required(),
  }).identifier(['userId', 'date']),

  History: a.model({
    userId: a.id().required(),
    userName: a.string().required(),
    message: a.string().required(),
    isProcessed: a.boolean().required(),
    groupId: a.id(),
    recordedAt: a.string(),
  }).secondaryIndexes((index) => [
    index('groupId').sortKeys(['recordedAt']).queryField('listHistoriesByGroup'),
  ]),

  Config: a.model({
    id: a.string().required(),
    seasonStartDate: a.date().required(),
    seasonEndDate: a.date().required(),
    reissuePassword: a.string(),
    seedVersion: a.integer(),
  }).identifier(['id']),

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
  // resource だけでは「モデルに認可ルールが無い」と判定されるため、
  // API Key 側は空の操作許可で閉じる
  allow.publicApiKey().to([]),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      // AppSync max is 365 days; exactly 365 can fail due to clock skew
      expiresInDays: 364,
    },
  },
});
