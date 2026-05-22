import { join } from 'node:path';
import { isCI, isFile, readJsonFile } from 'js-utils-kit';
import git from 'use-git';
import zylog from 'zylog';
import type { Config, Json, ScopedStore } from '../types';
import { args, hasFlag } from '../utils/cli';

const cwd = process.cwd();

async function createFileCtx<T = unknown>(path: string) {
  const exists = await isFile(path);

  return {
    path,
    exists,
    content: exists ? await readJsonFile<T>(path) : null,
  } as const;
}

export const ctx = {
  /** Current working directory where the CLI is executed */
  cwd,

  /** Indicates if running in a CI environment */
  isCI,

  /** CLI arguments */
  args,

  /** Indicates whether execution should be simulated without side effects */
  dryRun: hasFlag(['--dry-run', '-d']),

  /** Logger */
  logger: {
    trace: (...params) => zylog.trace(...params),
    debug: (...params) => zylog.debug(...params),
    info: (...params) => zylog.info(...params),
    success: (...params) => zylog.success(...params),
    warn: (...params) => zylog.warn(...params),
    error: (...params) => zylog.error(...params),
    fatal: (...params) => zylog.fatal(...params),
  } as Record<NonNullable<Exclude<Config['logLevel'], 'silent'>>, (...params: unknown[]) => void>,

  /**
   * Shared namespace-based store for cross-plugin communication.
   *
   * @remarks
   * - Each plugin gets its own isolated namespace.
   * - Only the namespace owner can mutate its data.
   * - All plugins can read from any namespace using `get(name)`.
   *
   * @example
   * ```ts
   * // inside plugin
   * ctx.ns.set({ version: '1.0.0' });
   *
   * // inside another plugin
   * const data = ctx.store.get('plugin-name');
   * ```
   */
  store: {} as ScopedStore,

  /** Files */
  files: {
    packageJson: await createFileCtx<Json>(join(cwd, 'package.json')),
    denoJson: await createFileCtx(join(cwd, 'deno.json')),
    jsrJson: await createFileCtx(join(cwd, 'jsr.json')),
  },

  /** Indicates whether Git is initialized in the current working directory. */
  hasGit: await git.isInitialized(),
};
