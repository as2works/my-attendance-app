/**
 * Amplify / CDK が「まだ無い CloudFormation スタック」を失敗と誤認する既知不具合の回避。
 * node_modules の判定を、does not exist なら新規扱いになるよう緩める。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  {
    path: join(root, 'node_modules/@aws-cdk/toolkit-lib/lib/api/cloudformation/stack-helpers.js'),
    find: `            if (e.name === 'ValidationError' && (0, util_1.formatErrorMessage)(e) === \`Stack with id \${stackName} does not exist\`) {
                return new CloudFormationStack(cfn, stackName, undefined);
            }`,
    replace: `            const formatted = (0, util_1.formatErrorMessage)(e);
            if (String(formatted).includes('does not exist') || e.name === 'ValidationError' || e.message === 'ValidationError') {
                return new CloudFormationStack(cfn, stackName, undefined);
            }`,
  },
  {
    path: join(root, 'node_modules/@aws-cdk/toolkit-lib/lib/api/stack-events/stack-event-poller.js'),
    find: `            if (!(e.name === 'ValidationError' && (0, util_1.formatErrorMessage)(e) === \`Stack [\${this.props.stackArn}] does not exist\`)) {
                throw e;
            }`,
    replace: `            const formatted = (0, util_1.formatErrorMessage)(e);
            if (!(String(formatted).includes('does not exist') || e.name === 'ValidationError' || e.message === 'ValidationError')) {
                throw e;
            }`,
  },
];

for (const file of files) {
  if (!existsSync(file.path)) {
    console.warn('skip (not found):', file.path);
    continue;
  }
  const source = readFileSync(file.path, 'utf8');
  if (source.includes("String(formatted).includes('does not exist')")) {
    continue;
  }
  if (!source.includes(file.find)) {
    console.warn('skip (pattern changed):', file.path);
    continue;
  }
  writeFileSync(file.path, source.replace(file.find, file.replace));
  console.log('patched', file.path);
}
