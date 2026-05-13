import pkg, { name } from '../../package.json' with { type: 'json' };
import schema from '../../schema.json' with { type: 'json' };

export { pkg, schema };

export const CONFIG_FILES = [
  `.${name}.json`,
  `.${name}.config.json`,

  `${name}.json`,
  `${name}.config.json`,

  `${name}.js`,
  `${name}.cjs`,
  `${name}.mjs`,
  `${name}.ts`,
  `${name}.cts`,
  `${name}.mts`,

  `.${name}.js`,
  `.${name}.cjs`,
  `.${name}.mjs`,
  `.${name}.ts`,
  `.${name}.cts`,
  `.${name}.mts`,

  `${name}.config.js`,
  `${name}.config.cjs`,
  `${name}.config.mjs`,
  `${name}.config.ts`,
  `${name}.config.cts`,
  `${name}.config.mts`,

  `.${name}.config.js`,
  `.${name}.config.cjs`,
  `.${name}.config.mjs`,
  `.${name}.config.ts`,
  `.${name}.config.cts`,
  `.${name}.config.mts`,
] as const;
