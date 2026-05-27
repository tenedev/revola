import { setEnv } from 'js-utils-kit';
import semver from 'semver';
import { resolveLatestVersion } from '../utils/version';
import { ctx } from './ctx';

export async function prepareRuntime() {
  setEnv('REVOLA_DATE', new Date().toISOString().split('T')[0] as string);
  setEnv('REVOLA_NODE_PREVIOUS_VERSION', ctx.files.packageJson.content?.version as string);
  setEnv(
    'REVOLA_DENO_PREVIOUS_VERSION',
    (ctx.files.denoJson.content?.version || ctx.files.jsrJson.content?.version) as string,
  );
  setEnv(
    'REVOLA_PREVIOUS_VERSION',
    resolveLatestVersion([
      ctx.files.packageJson.content?.version,
      ctx.files.denoJson.content?.version,
      ctx.files.jsrJson.content?.version,
    ]) as string,
  );
}
