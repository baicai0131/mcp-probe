import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads and validates an MCP test suite from a JSON file
 * @param {string} filePath
 * @param {object} [overrides]
 * @returns {object}
 */
export function loadSuite(filePath, overrides = {}) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Test suite file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  let suite;
  try {
    suite = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse test suite JSON (${resolvedPath}): ${err.message}`);
  }

  if (!suite || typeof suite !== 'object') {
    throw new Error('Test suite root must be a JSON object');
  }

  // Apply overrides (e.g. from CLI flags)
  if (overrides.serverCommand) {
    suite.server = suite.server || {};
    suite.server.command = overrides.serverCommand;
  }

  if (overrides.timeout) {
    suite.server = suite.server || {};
    suite.server.timeout = overrides.timeout;
  }

  if (!suite.server || !suite.server.command) {
    throw new Error('Test suite must define "server.command" (or provide via --server CLI option)');
  }

  if (!Array.isArray(suite.tests) || suite.tests.length === 0) {
    throw new Error('Test suite must contain a non-empty "tests" array');
  }

  // Normalization
  suite.name = suite.name || path.basename(filePath, path.extname(filePath));
  suite.suitePath = resolvedPath;
  suite.suiteDir = path.dirname(resolvedPath);

  for (let i = 0; i < suite.tests.length; i++) {
    const test = suite.tests[i];
    test.id = test.id || `test-${i + 1}`;
    test.name = test.name || `Test #${i + 1}`;
    test.type = test.type || 'tool_call';
  }

  return suite;
}
