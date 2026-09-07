/**
 * Minimal zero-dependency CLI argument parser
 *
 * Supports:
 *   command [subcommand] [positional...]
 *   --option value
 *   --option=value
 *   --boolean-flag
 *   -v / -h (short flags)
 */

export function parseArgs(rawArgs) {
  const args = [...rawArgs];
  const options = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--') {
      positionals.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const keyVal = arg.slice(2);
      if (keyVal.includes('=')) {
        const [k, ...v] = keyVal.split('=');
        options[k] = v.join('=');
      } else {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          options[keyVal] = next;
          i++;
        } else {
          options[keyVal] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const flags = arg.slice(1);
      for (const f of flags) {
        if (f === 'v') options.verbose = true;
        else if (f === 'h') options.help = true;
        else options[f] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return {
    command: positionals[0] || null,
    subcommand: positionals[1] || null,
    positionals: positionals.slice(1),
    options
  };
}
