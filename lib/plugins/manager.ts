import { isAbsolute, resolve } from 'node:path';
import inquirer from 'inquirer';
import { exists, type PlainObject } from 'js-utils-kit';
import colors from 'use-colors';
import zylog from 'zylog';
import config from '../config';
import { PHASE_LOGS } from '../constants';
import { NamespaceStore } from '../runtime/ns-store';
import type { Ctx, Fn, HookName, Plugin, PluginEntry, PluginKeys } from '../types';
import { exec, toArray } from '../utils';
import { jiti } from '../utils/jiti';

export class PluginManager {
  private registry = new Map<string, PlainObject>();
  private plugins = new Map<
    string,
    {
      plugin: Plugin<PlainObject>;
      config: PlainObject;
      store: Ctx['store'];
    }
  >();
  private store!: NamespaceStore;

  constructor(
    private ctx: Ctx,
    private builtins: Record<string, Plugin<PlainObject>> = {},
  ) {
    this.store = new NamespaceStore();
  }

  /** Register all built-in plugins. */
  registerBuiltins() {
    for (const name in this.builtins) {
      this.registry.set(name, {});
    }
  }

  /** Register user-provided plugins with optional configuration. */
  register(plugins?: PluginEntry) {
    for (const plugin in plugins) {
      this.registry.set(plugin, plugins[plugin] ?? {});
    }
  }

  /** Load and resolve all registered plugins into executable instances. */
  async load() {
    for (const [name, config] of this.registry.entries()) {
      const plugin = await this.resolvePlugin(name);

      const store = this.store.createNamespace(plugin.name);

      this.plugins.set(plugin.name, { plugin, config, store });
    }
  }

  /**
   * Resolve plugin source:
   * 1. built-in
   * 2. local file → jiti
   * 3. npm → native import / require
   */
  private async resolvePlugin(name: string) {
    let mod: { default: Plugin<PlainObject> };

    // 1. built-in
    const builtin = this.builtins[name];
    if (builtin) mod = { default: builtin };
    // 2. local file
    else if (name.startsWith('.') || name.startsWith('/') || isAbsolute(name)) {
      const filePath = isAbsolute(name) ? name : resolve(this.ctx.cwd, name);

      if (!(await exists(filePath)))
        throw new Error(`Plugin ${name} not found at path: ${filePath}`);

      mod = await jiti.import(filePath);
    } else mod = await import(name); // 3. package

    return this.extractPluginFromMod(mod, name);
  }

  /** Validate and extract a plugin object from an imported module. */
  private extractPluginFromMod(mod: { default: Plugin<PlainObject> }, name: string) {
    if (!('default' in mod))
      throw new Error(
        `Plugin ${colors.underline(name)} must have a default export.\nYou exported: ${Object.keys(mod).join(', ') || 'nothing'}`,
      );

    const plugin = mod.default;

    if (!plugin || typeof plugin !== 'object')
      throw new Error(`Plugin ${colors.underline(name)} default export must be an object.`);

    if (!plugin.name)
      throw new Error(`Plugin missing ${colors.underline('name')} property: ${name}`);

    zylog.debug(
      `Plugin ${colors.magentaBright(plugin.name)} (${colors.gray(name)}) → ${
        plugin.isEnabled ? colors.green('ACTIVE') : colors.red('SKIPPED')
      }`,
    );

    return plugin;
  }

  /** Orchestrates the plugin lifecycle in sequence */
  async run() {
    await this.runPlugins('pre');

    await this.runHook('before:init');
    await this.runPlugins('init');
    await this.runPrompts();
    await this.runHook('after:init');

    await this.runPlugins('validate');

    await this.runHook('before:version');
    await this.runPlugins('getVersion');
    await this.runPlugins('bumpVersion');
    await this.runPlugins('setVersion');
    await this.runHook('after:version');

    await this.runHook('before:changelog');
    await this.runPlugins('generateChangelog');
    await this.runPlugins('writeChangelog');
    await this.runHook('after:changelog');

    await this.runHook('before:git');
    await this.runPlugins('git');
    await this.runHook('after:git');

    await this.runHook('before:publish');
    await this.runPlugins('publish');
    await this.runHook('after:publish');

    await this.runPlugins('post');
  }

  /** Execute user-defined and plugin-specific hooks for a given lifecycle stage. */
  async runHook(h: HookName) {
    zylog.debug(`Starting ${colors.magentaBright(h)} hook execution`);

    const arr = toArray(config.hooks?.[h]);
    if (arr.length) for (const r of arr) await exec(r);
    else zylog.trace(`No user ${colors.magentaBright(h)} hook found`);

    for (const [n, { plugin: p, config: c, store }] of this.plugins.entries()) {
      const fn = p.hooks?.[h];

      this.ctx = { ...this.ctx, store };

      if (fn) await fn.call(p, this.ctx, c);
      else
        zylog.trace(
          `Plugin ${colors.magentaBright.underline(n)} has no ${colors.magentaBright(h)} hook`,
        );
    }

    zylog.debug(`Finished ${colors.magentaBright(h)} hook execution`);
  }

  /** Run a specific lifecycle phase across all enabled plugins. */
  private async runPlugins<K extends PluginKeys>(key: K) {
    for (const [n, { plugin, config, store }] of this.plugins.entries()) {
      if (!plugin.isEnabled) continue;

      const fn = plugin[key];
      if (!fn) continue;

      this.ctx = { ...this.ctx, store };

      zylog.debug(`${PHASE_LOGS[key] ?? `Running ${key}`} for plugin ${n}`);
      await (fn as Fn<PlainObject>).call(plugin, this.ctx, config);
    }
  }

  /**
   * Executes plugin prompts (interactive or CI fallback) and stores results in namespace store.
   */
  private async runPrompts() {
    zylog.debug('Starting prompts phase');

    for (const [name, { plugin, store }] of this.plugins.entries()) {
      const prompts = plugin.prompts;

      if (!plugin.isEnabled || !prompts?.length) {
        zylog.trace(`Skipping prompts for plugin ${name} (disabled or none defined)`);
        continue;
      }

      this.ctx = { ...this.ctx, store };

      zylog.debug(`Running prompts for plugin ${name}`);

      const answers: Record<string, unknown> = {};

      for (const prompt of prompts) {
        if (!prompt.name) {
          zylog.trace(`Skipping unnamed prompt in plugin ${name}`);
          continue;
        }

        if (this.ctx.isCI) {
          zylog.trace(`CI mode → resolving fallback for ${prompt.name} in plugin ${name}`);
          answers[prompt.name] = prompt.fallback ? await prompt.fallback(this.ctx) : undefined;
          continue;
        }

        zylog.trace(`Prompting ${prompt.name} for plugin ${name}`);

        const res = await inquirer.prompt(prompt);
        answers[prompt.name] = res[prompt.name];
      }

      zylog.debug(`Storing prompt results for plugin ${name}`);

      this.ctx.store.set({
        answers,
      });
    }

    zylog.debug('Finished prompts phase');
  }
}
