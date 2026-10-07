import { defineFunction } from '@aws-amplify/backend';

export const appApi = defineFunction({
  name: 'app-api',
  entry: './handler.ts',
  timeoutSeconds: 30,
  // data スタックに載せてネスト間の循環依存を避ける
  resourceGroupName: 'data',
});
