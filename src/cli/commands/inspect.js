import { StdioClient } from '../../client/stdio-client.js';
import { validateJsonSchema } from '../../runner/assertions.js';

export async function runInspect(options) {
  const serverCommand = options.server;
  if (!serverCommand) {
    console.error('Error: Missing --server command.\nExample: mcp-probe inspect --server "node ./server.js"');
    process.exitCode = 1;
    return;
  }

  const client = new StdioClient({
    command: serverCommand,
    timeout: options.timeout ? Number(options.timeout) : 10000,
    verbose: Boolean(options.verbose)
  });

  try {
    console.log(`Connecting to MCP server: "${serverCommand}"...`);
    const initResult = await client.initialize();

    console.log('\n================ MCP Server Inspection ================');
    console.log(`Server:           ${initResult.serverInfo?.name || 'Unknown'} (v${initResult.serverInfo?.version || '0.0.0'})`);
    console.log(`Protocol Version: ${initResult.protocolVersion}`);
    console.log(`Capabilities:     ${Object.keys(initResult.capabilities || {}).join(', ') || 'none'}\n`);

    // Tools
    let tools = [];
    try {
      tools = await client.listTools();
    } catch (err) {
      console.log(`Tools:            [Error listing tools: ${err.message}]`);
    }

    console.log(`---------------- Available Tools (${tools.length}) ----------------`);
    if (tools.length === 0) {
      console.log('  No tools advertised by server.');
    } else {
      for (const tool of tools) {
        console.log(`• \x1b[1m${tool.name}\x1b[0m: ${tool.description || '(no description)'}`);
        const schema = tool.inputSchema || {};
        const val = validateJsonSchema(schema);

        if (!val.valid) {
          console.log(`  \x1b[31m⚠ Invalid inputSchema: ${val.errors.join(', ')}\x1b[0m`);
        }

        const props = schema.properties || {};
        const required = new Set(schema.required || []);
        const propKeys = Object.keys(props);

        if (propKeys.length > 0) {
          console.log('  Parameters:');
          for (const p of propKeys) {
            const reqMark = required.has(p) ? '\x1b[33m*\x1b[0m' : ' ';
            const pType = props[p].type || 'any';
            const pDesc = props[p].description ? ` - ${props[p].description}` : '';
            console.log(`    ${reqMark} ${p} (${pType})${pDesc}`);
          }
        } else {
          console.log('  Parameters: (none)');
        }
        console.log('');
      }
    }

    // Resources
    let resources = [];
    try {
      resources = await client.listResources();
    } catch {
      // Ignored if not supported
    }

    if (resources.length > 0) {
      console.log(`---------------- Available Resources (${resources.length}) ----------------`);
      for (const res of resources) {
        console.log(`• \x1b[1m${res.name || res.uri}\x1b[0m (${res.uri}) [${res.mimeType || 'unknown'}]`);
      }
      console.log('');
    }

    // Prompts
    let prompts = [];
    try {
      prompts = await client.listPrompts();
    } catch {
      // Ignored if not supported
    }

    if (prompts.length > 0) {
      console.log(`---------------- Available Prompts (${prompts.length}) ----------------`);
      for (const prompt of prompts) {
        console.log(`• \x1b[1m${prompt.name}\x1b[0m: ${prompt.description || '(no description)'}`);
      }
      console.log('');
    }

    console.log('=======================================================\n');
  } catch (err) {
    console.error(`\x1b[31mFailed to inspect server: ${err.message}\x1b[0m`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}
