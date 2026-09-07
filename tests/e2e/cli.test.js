import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const binPath = path.resolve(rootDir, 'bin/mcp-probe.js');
const mockServer = path.resolve(rootDir, 'tests/fixtures/mock-mcp-server.js');
const sampleSuite = path.resolve(rootDir, 'tests/fixtures/sample-suite.json');

describe('E2E CLI Tests', () => {
  test('prints help message with --help', async () => {
    const { stdout } = await execFileAsync(process.execPath, [binPath, '--help']);
    assert.ok(stdout.includes('mcp-probe'));
    assert.ok(stdout.includes('COMMANDS:'));
    assert.ok(stdout.includes('test'));
    assert.ok(stdout.includes('inspect'));
    assert.ok(stdout.includes('call'));
    assert.ok(stdout.includes('init'));
  });

  test('prints version with --version', async () => {
    const { stdout } = await execFileAsync(process.execPath, [binPath, '--version']);
    assert.ok(stdout.includes('0.1.0'));
  });

  test('executes inspect command against mock server', async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      binPath,
      'inspect',
      '--server',
      `node "${mockServer}"`
    ]);

    assert.ok(stdout.includes('mock-math-server'));
    assert.ok(stdout.includes('Available Tools (3)'));
    assert.ok(stdout.includes('calculate'));
    assert.ok(stdout.includes('echo'));
  });

  test('executes call command with tool and arguments', async () => {
    const argsJson = JSON.stringify({ operation: 'multiply', a: 6, b: 7 });
    const { stdout } = await execFileAsync(process.execPath, [
      binPath,
      'call',
      '--server',
      `node "${mockServer}"`,
      '--tool',
      'calculate',
      '--args',
      argsJson
    ]);

    const clean = stdout.replace(/\x1b\[[0-9;]*m/g, '');
    assert.ok(clean.includes('Tool:     calculate'));
    assert.ok(clean.includes('Status:   SUCCESS'));
    assert.ok(clean.includes('Result: 42'));
  });

  test('executes test suite and generates JUnit and Markdown reports', async () => {
    const junitReport = path.resolve(rootDir, 'test-results/e2e-junit.xml');
    const mdReport = path.resolve(rootDir, 'test-results/e2e-summary.md');

    // Clean old files
    if (fs.existsSync(junitReport)) fs.unlinkSync(junitReport);
    if (fs.existsSync(mdReport)) fs.unlinkSync(mdReport);

    const { stdout } = await execFileAsync(process.execPath, [
      binPath,
      'test',
      sampleSuite,
      '--report-junit',
      junitReport,
      '--report-markdown',
      mdReport
    ]);

    assert.ok(stdout.includes('MCP Probe Test Suite: Mock Math Server Comprehensive Suite'));
    assert.ok(stdout.includes('PASSED'));
    assert.ok(fs.existsSync(junitReport));
    assert.ok(fs.existsSync(mdReport));

    const junitContent = fs.readFileSync(junitReport, 'utf-8');
    assert.ok(junitContent.includes('<testsuites name="mcp-probe"'));
    assert.ok(junitContent.includes('<testcase classname="calculate" name="Tool: calculate addition'));

    const mdContent = fs.readFileSync(mdReport, 'utf-8');
    assert.ok(mdContent.includes('# MCP Probe Test Report'));
    assert.ok(mdContent.includes('PASSED'));
  });

  test('executes init command to generate starter suite', async () => {
    const tempInitPath = path.resolve(rootDir, 'test-results/scaffold-suite.json');
    if (fs.existsSync(tempInitPath)) fs.unlinkSync(tempInitPath);

    const { stdout } = await execFileAsync(process.execPath, [
      binPath,
      'init',
      tempInitPath
    ]);

    assert.ok(stdout.includes('Initialized starter test suite'));
    assert.ok(fs.existsSync(tempInitPath));

    const content = JSON.parse(fs.readFileSync(tempInitPath, 'utf-8'));
    assert.equal(content.name, 'Sample MCP Test Suite');
    assert.ok(Array.isArray(content.tests));
  });
});
