import type { PlainObject } from 'js-utils-kit';
import colors from 'use-colors';

/**
 * A namespace-based store for isolated, cross-plugin data sharing.
 *
 * Each plugin gets its own isolated namespace via {@link NamespaceStore.createNamespace}.
 * Only the namespace owner can write to it, but any plugin can read from any namespace.
 *
 * @example
 * ```ts
 * const store = new NamespaceStore();
 *
 * const ns = store.createNamespace('my-plugin');
 * ns.set({ version: '1.0.0' });
 * ns.get(); // { version: '1.0.0' }
 * ```
 */
export class NamespaceStore {
  private data = new Map<string, PlainObject>();
  private owners = new Map<string, symbol>();

  /**
   * Creates an isolated namespace for a plugin.
   *
   * @example
   * ```ts
   * const store = new NamespaceStore();
   *
   * const ns = store.createNamespace('NPM');
   * ns.set({ version: '1.0.0' });
   * ns.get(); // { version: '1.0.0' }
   *
   * // Calling again returns same namespace
   * const same = store.createNamespace('NPM');
   * same.get(); // { version: '1.0.0' }
   * ```
   */
  createNamespace(
    /** Unique identifier for the namespace, typically the plugin name */ name: string,
  ) {
    let key = this.owners.get(name);

    if (!key) {
      key = Symbol(name);
      this.owners.set(name, key);
      this.data.set(name, {});
    }

    const data = this.data;
    const owners = this.owners;

    return {
      /**
       * The name of this namespace, matching the plugin name it was created for.
       *
       * @example
       * ```ts
       * const ns = store.createNamespace('NPM');
       * console.log(ns.name); // 'NPM'
       * ```
       */
      name,

      /**
       * Merges the given value into the namespace's current data (shallow merge).
       *
       * Only the namespace owner can call this.
       *
       * @throws If called by a non-owner namespace.
       *
       * @example
       * ```ts
       * const ns = store.createNamespace('NPM');
       *
       * ns.set({ version: '1.0.0' });
       * ns.set({ ready: true });
       * ns.get(); // { version: '1.0.0', ready: true }
       * ```
       */
      set<T extends PlainObject>(value: T) {
        if (owners.get(name) !== key) {
          throw new Error(`Unauthorized write to namespace "${name}"`);
        }

        const prev = data.get(name) ?? {};
        data.set(name, { ...prev, ...value });
      },

      /**
       * Replaces the namespace's data entirely with the given value.
       *
       * Unlike {@link set}, this does not merge, it overwrites.
       *
       * @throws If called by a non-owner namespace.
       *
       * @example
       * ```ts
       * const ns = store.createNamespace('NPM');
       *
       * ns.set({ version: '1.0.0', ready: true });
       * ns.replace({ version: '2.0.0' });
       * ns.get(); // { version: '2.0.0' } 'ready' is gone
       * ```
       */
      replace<T>(value: T) {
        if (owners.get(name) !== key) {
          throw new Error(`Unauthorized write to namespace ${colors.magentaBright(name)}`);
        }

        data.set(name, value as PlainObject);
      },

      /**
       * Reads data from a namespace.
       *
       * - Called with no argument → returns this plugin's own namespace data.
       * - Called with a name → returns another plugin's namespace data (read-only cross-plugin access).
       *
       * @returns The namespace data, or `undefined` if not found.
       *
       * @example
       * ```ts
       * const npm = store.createNamespace('NPM');
       * npm.set({ version: '1.0.0' });
       *
       * const n = store.createNamespace('N');
       *
       * // read own
       * n.get(); // undefined (N hasn't written anything yet)
       *
       * // read another plugin's namespace
       * n.get('NPM'); // { version: '1.0.0' }
       * n.get<{ version: string }>('NPM')?.version; // '1.0.0'
       * ```
       */
      get<T = PlainObject>(name?: string) {
        return data.get(name ?? this.name) as T | undefined;
      },
    };
  }
}
