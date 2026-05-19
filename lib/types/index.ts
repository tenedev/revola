import type { PackageJson } from 'js-utils-kit';
import type z from 'zod';
import type { REVOLA_ENV } from '../constants';
import type { KNOWN_COMMANDS, KNOWN_FLAGS } from '../constants/cli';
import type { ctx } from '../runtime/ctx';
import type { NamespaceStore } from '../runtime/ns-store';
import type { ConfigSchema } from '../schemas/config';
import type { PluginsSchema } from '../schemas/config/plugins';

export * from './plugin';

export type HookPhase = 'before' | 'after';

export type HookEvent = 'init' | 'version' | 'git' | 'publish' | 'changelog';

export type HookName = `${HookPhase}:${HookEvent}`;

export type KnownCommand = (typeof KNOWN_COMMANDS)[number]['command'];

type Flags = (typeof KNOWN_FLAGS)[number];

export type KnownFlag = Flags['flag'] | Extract<Flags, { shortFlag: string }>['shortFlag'];

export type Args = KnownCommand | KnownFlag;

export type ArgsArray = Array<KnownCommand | KnownFlag>;

export type Json = Pick<PackageJson, 'version' | 'private'> & {
  packages: {
    '': {
      version: string;
    };
  };
  revola: Config;
};

type CleanConfig = Omit<Config, '$schema'>;

export type Config = z.infer<typeof ConfigSchema>;

export type UserConfig = CleanConfig | (() => CleanConfig | Promise<CleanConfig>);

export type ScopedStore = ReturnType<NamespaceStore['createNamespace']>;

export type Ctx = typeof ctx;

export type PluginEntry = z.infer<typeof PluginsSchema>;

export type RevolaEnv = (typeof REVOLA_ENV)[number];
