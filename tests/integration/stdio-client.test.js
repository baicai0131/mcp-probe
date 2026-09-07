import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioClient } from '../../src/client/stdio-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockServerPath = path.resolve(__dirname, '../fixtures/mock-mcp-server.js');

describe('StdioClient Integration Tests', () => {
  let client;

  before(async () => {
    client = new StdioClient({
      command: 'node',
      args: [mockServerPath],
      timeout: 5000
    });
    await client.initialize();
  });

  after(async () => {
    if (client) {
      await client.close();
    }
  });

  test('successfully initializes and receives serverInfo', () => {
    assert.equal(client.initialized, true);
    assert.equal(client.serverInfo.name, 'mock-math-server');
    assert.equal(client.serverInfo.version, '1.2.0');
    assert.equal(client.protocolVersion, '2024-11-05');
  });

  test('lists available tools with schemas', async () => {
    const tools = await client.listTools();
    assert.ok(Array.isArray(tools));
    assert.equal(tools.length, 3);

    const calc = tools.find((t) => t.name === 'calculate');
    assert.ok(calc);
    assert.equal(calc.description, 'Performs basic arithmetic operations');
    assert.equal(calc.inputSchema.type, 'object');
    assert.deepEqual(calc.inputSchema.required, ['operation', 'a', 'b']);
  });

  test('calls calculate tool with valid arguments', async () => {
    const res = await client.callTool('calculate', {
      operation: 'multiply',
      a: 7,
      b: 8
    });
    assert.equal(res.isError, false);
    assert.ok(res.content.length > 0);
    assert.equal(res.content[0].text, 'Result: 56');
    assert.ok(typeof res.durationMs === 'number');
  });

  test('handles tool level errors correctly', async () => {
    const res = await client.callTool('calculate', {
      operation: 'divide', // unsupported operation in mock
      a: 10,
      b: 2
    });
    assert.equal(res.isError, true);
    assert.ok(res.content[0].text.includes("unknown operation 'divide'"));
  });

  test('lists and reads resources', async () => {
    const resources = await client.listResources();
    assert.ok(resources.length > 0);
    assert.equal(resources[0].uri, 'config://settings');

    const contents = await client.readResource('config://settings');
    assert.ok(contents.length > 0);
    assert.ok(contents[0].text.includes('production'));
  });

  test('ping returns empty object', async () => {
    const res = await client.ping();
    assert.deepEqual(res, {});
  });
});
