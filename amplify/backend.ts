import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { appApi } from './functions/app-api/resource';

defineBackend({
  data,
  appApi,
});
