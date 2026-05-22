import { setEnv } from 'js-utils-kit';
import { ctx } from './ctx';

export async function prepareRuntime() {
  setEnv('REVOLA_DATE', new Date().toISOString().split('T')[0] as string);
  setEnv('REVOLA_NODE_PREVIOUS_VERSION', ctx.files.packageJson.content?.version || '');
  setEnv('REVOLA_DENO_PREVIOUS_VERSION', '');
  setEnv('REVOLA_PREVIOUS_VERSION', '');
}
