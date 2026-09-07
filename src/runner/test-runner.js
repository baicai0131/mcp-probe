import fs from 'node:fs';
import path from 'node:path';
import { StdioClient } from '../client/stdio-client.js';
import {
  evaluateAssertions,
  validateJsonSchema,
  AssertionResult,
  extractTextContent
} from './assertions.js';

export class TestCaseResult {
  constructor(testCase) {
    this.id = testCase.id;
    this.name = testCase.name;
    this.type = testCase.type;
    this.tool = testCase.tool;
    this.durationMs = 0;
    this.passed = false;
    this.error = null;
    this.assertions = [];
    this.rawResult = null;
  }
}

export class SuiteResult {
  constructor(suite) {
    this.suiteName = suite.name;
    this.description = suite.description;
    this.serverCommand = suite.server.command;
    this.serverInfo = null;
    this.protocolVersion = null;
    this.durationMs = 0;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.testResults = [];
    this.error = null;
  }
}

/**
 * Runs an MCP test suite against a target server
 * @param {object} suite
 * @param {object} [options]
 * @param {boolean} [options.verbose]
 * @param {function} [options.onTestStart]
 * @param {function} [options.onTestEnd]
 * @returns {Promise<SuiteResult>}
 */
export async function runSuite(suite, options = {}) {
  const suiteResult = new SuiteResult(suite);
  const startTime = performance.now();

  let serverCwd = process.cwd();
  if (suite.server.cwd) {
    serverCwd = path.resolve(suite.suiteDir || process.cwd(), suite.server.cwd);
  } else if (suite.suiteDir) {
    const parts = suite.server.command.trim().split(/\s+/);
    if (parts.length > 1) {
      const scriptArg = parts[1].replace(/['"]/g, '');
      if (fs.existsSync(path.resolve(suite.suiteDir, scriptArg))) {
        serverCwd = suite.suiteDir;
      }
    }
  }

  const client = new StdioClient({
    command: suite.server.command,
    args: suite.server.args || [],
    env: suite.server.env || {},
    cwd: serverCwd,
    timeout: suite.server.timeout || 10000,
    verbose: options.verbose
  });

  try {
    // 1. Initialize Handshake
    const initResult = await client.initialize({
      protocolVersion: suite.server.protocolVersion
    });
    suiteResult.serverInfo = initResult.serverInfo;
    suiteResult.protocolVersion = initResult.protocolVersion;

    // 2. Execute Tests
    for (const testCase of suite.tests) {
      if (typeof options.onTestStart === 'function') {
        options.onTestStart(testCase);
      }

      const caseResult = new TestCaseResult(testCase);
      const caseStart = performance.now();

      try {
        await executeTestCase(client, testCase, caseResult);
      } catch (err) {
        caseResult.passed = false;
        caseResult.error = err.message || String(err);
        caseResult.assertions.push(new AssertionResult(
          'execution',
          false,
          `Test execution failed with exception: ${caseResult.error}`
        ));
      }

      caseResult.durationMs = Math.round(performance.now() - caseStart);
      caseResult.passed = caseResult.assertions.length > 0 &&
        caseResult.assertions.every((a) => a.passed);

      suiteResult.testResults.push(caseResult);
      if (caseResult.passed) {
        suiteResult.passedTests++;
      } else {
        suiteResult.failedTests++;
      }

      if (typeof options.onTestEnd === 'function') {
        options.onTestEnd(caseResult);
      }
    }
  } catch (err) {
    suiteResult.error = `Failed to connect or initialize MCP server: ${err.message}`;
    suiteResult.failedTests++;
  } finally {
    await client.close();
    suiteResult.durationMs = Math.round(performance.now() - startTime);
    suiteResult.totalTests = suiteResult.testResults.length || (suiteResult.error ? 1 : 0);
  }

  return suiteResult;
}

/**
 * Execute a single test case
 */
async function executeTestCase(client, testCase, caseResult) {
  const type = testCase.type || 'tool_call';

  if (type === 'tool_call') {
    if (!testCase.tool) {
      throw new Error('Test case of type "tool_call" must define "tool" name');
    }
    const result = await client.callTool(testCase.tool, testCase.args || {}, testCase.timeoutMs);
    caseResult.rawResult = result;
    caseResult.assertions = evaluateAssertions(testCase, result);
    return;
  }

  if (type === 'schema_validation') {
    const tools = await client.listTools();
    caseResult.rawResult = { toolsCount: tools.length };

    if (testCase.tool) {
      const targetTool = tools.find((t) => t.name === testCase.tool);
      if (!targetTool) {
        caseResult.assertions.push(new AssertionResult(
          'tool_exists',
          false,
          `Tool '${testCase.tool}' was not listed by server`
        ));
      } else {
        const val = validateJsonSchema(targetTool.inputSchema);
        caseResult.assertions.push(new AssertionResult(
          `schema_validation(${testCase.tool})`,
          val.valid,
          val.valid ? 'inputSchema is valid' : `Invalid inputSchema: ${val.errors.join(', ')}`
        ));
      }
    } else {
      // Validate all tools
      if (tools.length === 0) {
        caseResult.assertions.push(new AssertionResult(
          'tools_available',
          false,
          'No tools returned by tools/list'
        ));
        return;
      }
      for (const tool of tools) {
        const val = validateJsonSchema(tool.inputSchema);
        caseResult.assertions.push(new AssertionResult(
          `schema(${tool.name})`,
          val.valid,
          val.valid ? `Valid inputSchema for ${tool.name}` : `Invalid schema for ${tool.name}: ${val.errors.join(', ')}`
        ));
      }
    }
    return;
  }

  if (type === 'resource_check') {
    if (testCase.uri) {
      const contents = await client.readResource(testCase.uri);
      caseResult.rawResult = contents;
      const fullText = (contents || []).map((c) => c.text || '').join('\n');
      if (testCase.expect?.content_contains) {
        const needle = testCase.expect.content_contains;
        const found = fullText.includes(needle);
        caseResult.assertions.push(new AssertionResult(
          `resource_content_contains("${needle}")`,
          found,
          found ? 'Resource content matches expected substring' : `Resource content missing "${needle}"`
        ));
      } else {
        caseResult.assertions.push(new AssertionResult(
          'resource_read',
          contents.length > 0,
          `Read resource ${testCase.uri} successfully`
        ));
      }
    } else {
      const resources = await client.listResources();
      caseResult.rawResult = { resourcesCount: resources.length };
      caseResult.assertions.push(new AssertionResult(
        'resources_list',
        Array.isArray(resources),
        `Found ${resources.length} resources`
      ));
    }
    return;
  }

  throw new Error(`Unknown test type '${type}'`);
}
