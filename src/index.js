/**
 * mcp-probe programmatic API
 */

export { StdioClient } from './client/stdio-client.js';
export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  CLIENT_INFO,
  MCP_METHODS,
  RPC_ERROR_CODES
} from './client/protocol.js';

export {
  evaluateAssertions,
  validateJsonSchema,
  AssertionResult,
  extractTextContent,
  deepEqual,
  containsSubset
} from './runner/assertions.js';

export { loadSuite } from './runner/suite-loader.js';
export { runSuite, SuiteResult, TestCaseResult } from './runner/test-runner.js';
export { ConsoleReporter } from './reporter/console-reporter.js';
export { generateJunitXml, writeJunitReport } from './reporter/junit-reporter.js';
export { generateMarkdownReport, writeMarkdownReport } from './reporter/markdown-reporter.js';
