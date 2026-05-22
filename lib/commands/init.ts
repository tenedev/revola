import { writeFile } from 'node:fs/promises';
import { EOL } from 'node:os';
import { extname, join } from 'node:path';
import inquirer from 'inquirer';
import { detectPM } from 'js-utils-kit';
import colors from 'use-colors';
import zylog from 'zylog';
import { DEFAULT_CONFIG } from '../constants';
import { CONFIG_FILES, pkg } from '../constants/paths';
import { ctx } from '../runtime/ctx';

export async function init() {
  if (ctx.isCI) return zylog.error('The init command is not supported in CI environments');

  zylog.info(`Initializing ${colors.cyan`${pkg.displayName}`}`);

  const detectedPM = await detectPM();

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
          checked: ctx.files.packageJson.exists,
        },
        {
          name: 'JSR publishing',
          value: 'jsr',
          checked: ctx.files.jsrJson.exists || ctx.files.denoJson.exists,
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

  config.git = { ...config.git, enable: answers.features.includes('git') };

  config.npm = {
    ...config.npm,
    packageManager: detectedPM?.name || 'npm',
    publish: answers.features.includes('npm'),
  };

  config.jsr = {
    ...config.jsr,
    publish: answers.features.includes('jsr'),
  };

  config.changelog = {
    ...config.changelog,
    enabled: answers.features.includes('changelog'),
  };

  const ext = extname(answers.configFile);

  let content = '';

  switch (ext) {
    case '.js':
    case '.mjs': {
      content = `export default ${JSON.stringify(config, null, 2)};\n`;
      break;
    }

    case '.cjs': {
      content = `module.exports = ${JSON.stringify(config, null, 2)};\n`;
      break;
    }

    case '.ts':
    case '.mts': {
      content = `import type { UserConfig } from '${pkg.name}';

const config: UserConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;
      break;
    }

    case '.cts': {
      content = `import type { UserConfig } from '${pkg.name}';

const config: UserConfig = ${JSON.stringify(config, null, 2)};

module.exports = config;
`;
      break;
    }

    default: {
      content = `${JSON.stringify(config, null, 2)}${EOL}`;
    }
  }

  await writeFile(answers.configFile, content, 'utf8');

  zylog.success(`Created ${colors.green`${answers.configFile}`}`);
}
