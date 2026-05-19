import { spawn } from 'node:child_process';
import { envRef } from 'js-utils-kit';
import colors from 'use-colors';
import zylog, { type ZylogLevel } from 'zylog';
import { REVOLA_ENV } from '../constants';
import { ctx } from '../runtime/ctx';
import type { RevolaEnv } from '../types';
import { hasFlag } from './cli';

export function toArray(v: string | string[] = []) {
  return Array.isArray(v) ? v : [v];
}

export function resolveEnv(v: string) {
  return v.replaceAll(/\{\{\s*(.*?)\s*\}\}/g, (_, exp: string) => {
    const key = exp.trim() as RevolaEnv;

    if (REVOLA_ENV.includes(key)) return envRef(key);

    return `{{${exp}}`;
  });
}

export function exec(
  command: string | string[],
  {
    shell = true,
    stdio = 'inherit',
    cwd = ctx.cwd,
    env = process.env,
  }: {
    shell?: boolean;
    stdio?: 'inherit' | 'pipe';
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
) {
  const cmd = toArray(command).join(' ');

  zylog
    .with({
      prefix: 'exec',
    })
    .debug(`${colors.dim(cmd)}`);

  return new Promise<string | undefined>((resolve, reject) => {
    const child = spawn(resolveEnv(cmd), { shell, stdio, cwd, env });

    let stdout = '';
    let stderr = '';

    if (stdio === 'pipe') {
      child.stdout?.on('data', (d) => (stdout += d.toString()));
      child.stderr?.on('data', (d) => (stderr += d.toString()));
    }

    child.on('error', (err) => {
      reject(new Error(`Failed to execute command:\n${cmd}\n\n${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        return resolve(stdio === 'pipe' ? stdout.trim() : undefined);
      }

      reject(
        new Error(
          [`Command failed (${code})`, cmd, stderr && `\n${stderr.trim()}`]
            .filter(Boolean)
            .join('\n'),
        ),
      );
    });
  });
}

export function resolveLogLevel(): ZylogLevel | undefined {
  if (hasFlag(['--trace', '-T'])) return 'trace';
  if (hasFlag(['--debug', '-D'])) return 'debug';
  return;
}
