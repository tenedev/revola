import { join } from 'node:path';
import { isCI, isFile } from 'js-utils-kit';
import git from 'use-git';
import zylog from 'zylog';
import type { Config, ScopedStore } from '../types';
import { args, hasFlag } from '../utils/cli';

export const ctx = {
  /** Current working directory where the CLI is executed */
  cwd: process.cwd(),

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

  /** Indicates if a package.json file exists in the current working directory */
  async hasPackageJson() {
    return isFile(join(this.cwd, 'package.json'));
  },

  /** Indicates whether Git is initialized in the current working directory. */
  hasGit: await git.isInitialized(),
};
