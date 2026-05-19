import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import inquirer from 'inquirer';
import colors from 'use-colors';
import zylog from 'zylog';
import { DEFAULT_CONFIG } from '../constants';
import { CONFIG_FILES, pkg } from '../constants/paths';
import { ctx } from '../runtime/ctx';

export async function init() {
  zylog.info(`Initializing ${colors.cyan`${pkg.displayName}`}`);

  const answers = await inquirer.prompt([
    {
      type: 'select',
      name: 'configFile',
      message: 'Select config file',
      choices: CONFIG_FILES.map((file) => ({
        name: file,
        value: join(ctx.cwd, file),
      })),
      default: join(ctx.cwd, CONFIG_FILES[0]),
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to enable',
      choices: [
        {
          name: 'Git integration',
          value: 'git',
          checked: ctx.hasGit,
        },
        {
          name: 'npm publishing',
          value: 'npm',
          checked: async () => await ctx.hasPackageJson(),
        },
        {
          name: 'JSR publishing',
          value: 'jsr',
          checked: false,
        },
        {
          name: 'Changelog generation',
          value: 'changelog',
          checked: true,
        },
      ],
    },
  ]);

  const config = structuredClone(DEFAULT_CONFIG);

  const ext = extname(answers.configFile);

  let content = '';

  switch (ext) {
    case '.js':
    case '.mjs':
    case '.cjs': {
      content = `export default ${JSON.stringify(config, null, 2)};\n`;
      break;
    }

    case '.ts':
    case '.mts':
    case '.cts': {
      content = `import type { UserConfig } from '${pkg.name}';

const config: UserConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

      break;
    }

    default: {
      content = `${JSON.stringify(config, null, 2)}\n`;
    }
  }

  await writeFile(answers.configFile, content, 'utf8');

  zylog.success(`Created ${colors.green`${answers.configFile}`}`);
}
