import fs from 'node:fs';
import path from 'node:path';

export function runInit(targetPathArg) {
  const targetFile = targetPathArg || 'mcp-test.json';
  const resolved = path.resolve(process.cwd(), targetFile);

  if (fs.existsSync(resolved)) {
    console.error(`\x1b[31mError: File already exists: ${targetFile}\x1b[0m`);
    process.exitCode = 1;
    return;
  }

  const template = {
    name: "Sample MCP Test Suite",
    description: "Automated regression tests for MCP server",
    server: {
      command: "node ./server.js",
      timeout: 5000
    },
    tests: [
      {
        name: "Schema: Verify all tools conform to JSON Schema",
        type: "schema_validation"
      },
      {
        name: "Tool: Add two numbers",
        type: "tool_call",
        tool: "calculate",
        args: {
          operation: "add",
          a: 10,
          b: 25
        },
        expect: {
          error: false,
          content_contains: "35",
          max_duration_ms: 1000
        }
      },
      {
        name: "Error Handling: Invalid parameters",
        type: "tool_call",
        tool: "calculate",
        args: {
          operation: "unknown"
        },
        expect: {
          error: true,
          content_contains: "Invalid operation"
        }
      }
    ]
  };

  fs.writeFileSync(resolved, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`\x1b[32m✓ Initialized starter test suite at: ${targetFile}\x1b[0m`);
  console.log(`\nRun tests using:\n  npx mcp-probe test ${targetFile}\n`);
}
