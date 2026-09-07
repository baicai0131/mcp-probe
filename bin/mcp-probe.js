#!/usr/bin/env node

import { parseArgs } from '../src/cli/parser.js';
import { runInspect } from '../src/cli/commands/inspect.js';
import { runCall } from '../src/cli/commands/call.js';
import { runTest } from '../src/cli/commands/test.js';
import { runInit } from '../src/cli/commands/init.js';

const VERSION = '0.1.0';

const HELP_TEXT = `
\x1b[1m\x1b[36mmcp-probe\x1b[0m v${VERSION}
A fast, automated CLI test runner and specification validator for Model Context Protocol (MCP) servers.

\x1b[1mUSAGE:\x1b[0m
  mcp-probe <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32mtest\x1b[0m    <suite.json>     Run automated test suite against an MCP server
  \x1b[32minspect\x1b[0m                  Inspect server capabilities, tools, schemas, and resources
  \x1b[32mcall\x1b[0m                    Invoke a specific tool with arguments and measure latency
  \x1b[32minit\x1b[0m    [file.json]      Generate a starter test suite file (default: mcp-test.json)

\x1b[1mOPTIONS:\x1b[0m
  --server <cmd>            Server startup command (e.g. "node ./server.js" or "python server.py")
  --tool <name>             Tool name to call (for 'call' command)
  --args <json>             JSON-encoded arguments to pass to tool
  --timeout <ms>            Timeout per request in milliseconds (default: 10000)
  --report-junit <file>     Write test results to JUnit XML file
  --report-markdown <file>  Write test results to Markdown file
  -v, --verbose             Show detailed communication logs and raw responses
  -h, --help                Show this help message
  --version                 Show version number

\x1b[1mEXAMPLES:\x1b[0m
  \x1b[90m# Run a test suite:\x1b[0m
  mcp-probe test mcp-test.json

  \x1b[90m# Run suite and generate CI reports:\x1b[0m
  mcp-probe test --report-junit ./results.xml --report-markdown ./summary.md

  \x1b[90m# Inspect an MCP server:\x1b[0m
  mcp-probe inspect --server "python my_mcp_server.py"

  \x1b[90m# Call a tool directly:\x1b[0m
  mcp-probe call --server "node server.js" --tool calculate --args '{"operation":"add","a":5,"b":7}'

  \x1b[90m# Scaffold a new test suite:\x1b[0m
  mcp-probe init
`;

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.options.version) {
    console.log(`mcp-probe v${VERSION}`);
    return;
  }

  if (parsed.options.help || !parsed.command) {
    console.log(HELP_TEXT);
    return;
  }

  switch (parsed.command) {
    case 'test': {
      const suiteFile = parsed.positionals[0];
      await runTest(suiteFile, parsed.options);
      break;
    }
    case 'inspect': {
      await runInspect(parsed.options);
      break;
    }
    case 'call': {
      await runCall(parsed.options);
      break;
    }
    case 'init': {
      const targetFile = parsed.positionals[0];
      runInit(targetFile);
      break;
    }
    default:
      console.error(`\x1b[31mUnknown command: "${parsed.command}"\x1b[0m\n`);
      console.log(HELP_TEXT);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\x1b[31mUnexpected error:\x1b[0m ${err.stack || err.message}`);
  process.exit(1);
});
