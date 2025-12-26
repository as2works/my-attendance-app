
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    name: a.string().required(),
    order: a.integer(),
  }).authorization((allow) => [allow.publicApiKey()]),

  Schedule: a.model({
    userId: a.id().required(),
    date: a.date().required(),
    status: a.string().required(),
  }).identifier(['userId', 'date'])
    .authorization((allow) => [allow.publicApiKey()]),

  History: a.model({
    userId: a.id().required(),
    userName: a.string().required(),
    message: a.string().required(),
    isProcessed: a.boolean().required(),
  }).authorization((allow) => [allow.publicApiKey()]),

  Config: a.model({
    id: a.string().required(),
    seasonStartDate: a.date().required(),
    seasonEndDate: a.date().required(),
  }).identifier(['id'])
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyConfig: {
      expiresInDays: 365,
    },
  },
});
