import { StdioClient } from '../../client/stdio-client.js';
import { extractTextContent } from '../../runner/assertions.js';

export async function runCall(options) {
  const serverCommand = options.server;
  const toolName = options.tool;

  if (!serverCommand) {
    console.error('Error: Missing --server command.\nExample: mcp-probe call --server "node ./server.js" --tool calculate --args \'{"a": 1}\'');
    process.exitCode = 1;
    return;
  }

  if (!toolName) {
    console.error('Error: Missing --tool name.\nExample: mcp-probe call --server "node ./server.js" --tool calculate');
    process.exitCode = 1;
    return;
  }

  let args = {};
  if (options.args) {
    try {
      args = JSON.parse(options.args);
    } catch (err) {
      console.error(`Error: Failed to parse --args as JSON: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const client = new StdioClient({
    command: serverCommand,
    timeout: options.timeout ? Number(options.timeout) : 10000,
    verbose: Boolean(options.verbose)
  });

  try {
    await client.initialize();
    const result = await client.callTool(toolName, args);

    const isError = Boolean(result.isError);
    const statusColor = isError ? '\x1b[31m' : '\x1b[32m';
    const statusText = isError ? 'ERROR' : 'SUCCESS';

    console.log(`\nTool:     \x1b[1m${toolName}\x1b[0m`);
    console.log(`Status:   ${statusColor}${statusText}\x1b[0m`);
    console.log(`Latency:  \x1b[90m${result.durationMs}ms\x1b[0m`);
    console.log('Result:');

    const textContent = extractTextContent(result);

    // Check if output is JSON
    let rendered = textContent;
    try {
      const parsed = JSON.parse(textContent);
      rendered = JSON.stringify(parsed, null, 2);
    } catch {
      // not json, use raw text
    }

    console.log(rendered || '(empty output)');
    console.log('');

    if (isError) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`\x1b[31mTool call failed: ${err.message}\x1b[0m`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}
