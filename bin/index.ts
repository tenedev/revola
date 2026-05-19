import { readFile } from 'node:fs/promises';
import { print } from 'echo-banner';
import { resolveModuleRelative } from 'js-utils-kit';
import zylog from 'zylog';
import { runCommand } from '../lib/commands';
import { init } from '../lib/commands/init';
import config, { setConfig } from '../lib/config';
import { CORE_PLUGINS } from '../lib/constants';
import { EXAMPLES, KNOWN_COMMANDS, KNOWN_FLAGS } from '../lib/constants/cli';
import { pkg } from '../lib/constants/paths';
import { PluginManager } from '../lib/plugins/manager';
import { ctx } from '../lib/runtime/ctx';
import { prepareRuntime } from '../lib/runtime/prepare';
import { resolveLogLevel } from '../lib/utils';
import { hasFlag } from '../lib/utils/cli';
import { renderTemplate } from '../lib/utils/handlebars';

const { displayName, name, version } = pkg;

process.title = name;

if (hasFlag(['--version', '-v'])) {
  console.log(version);
  process.exit(0);
}

await print({
  pkg: {
    name,
    displayName,
    version,
  },
});

if (hasFlag('--no-color')) zylog.enableColors(0);

if (hasFlag(['--help', '-h'])) {
  console.log(
    renderTemplate(
      await readFile(resolveModuleRelative('../templates/help.hbs', import.meta.url), 'utf-8'),
      {
        name,
        KNOWN_COMMANDS,
        KNOWN_FLAGS,
        EXAMPLES,
      },
    ),
  );
  process.exit(0);
}

await setConfig();

zylog.level = resolveLogLevel() ?? config.logLevel ?? zylog.level;

await prepareRuntime();

await runCommand('init', init);

const manager = new PluginManager(ctx, CORE_PLUGINS);

manager.registerBuiltins();
manager.register(config.plugins);

await manager.load();
await manager.run();
