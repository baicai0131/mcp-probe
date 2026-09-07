/**
 * Terminal Console Reporter with ANSI colors and formatted tables
 */

// ANSI Color codes (can be disabled via NO_COLOR env var)
const supportsColor = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);

const colors = {
  reset: supportsColor ? '\x1b[0m' : '',
  bold: supportsColor ? '\x1b[1m' : '',
  dim: supportsColor ? '\x1b[2m' : '',
  italic: supportsColor ? '\x1b[3m' : '',
  red: supportsColor ? '\x1b[31m' : '',
  green: supportsColor ? '\x1b[32m' : '',
  yellow: supportsColor ? '\x1b[33m' : '',
  blue: supportsColor ? '\x1b[34m' : '',
  magenta: supportsColor ? '\x1b[35m' : '',
  cyan: supportsColor ? '\x1b[36m' : '',
  gray: supportsColor ? '\x1b[90m' : '',
  bgRed: supportsColor ? '\x1b[41m\x1b[37m' : '',
  bgGreen: supportsColor ? '\x1b[42m\x1b[30m' : ''
};

export class ConsoleReporter {
  constructor(options = {}) {
    this.verbose = Boolean(options.verbose);
  }

  printHeader(suite) {
    console.log(`\n${colors.bold}${colors.cyan}▶ MCP Probe Test Suite: ${suite.name}${colors.reset}`);
    if (suite.description) {
      console.log(`  ${colors.dim}${suite.description}${colors.reset}`);
    }
    console.log(`  ${colors.gray}Target server: ${suite.server?.command}${colors.reset}\n`);
  }

  printTestResult(caseResult) {
    const icon = caseResult.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;

    const duration = `${colors.dim}(${caseResult.durationMs}ms)${colors.reset}`;
    console.log(`  ${icon} ${colors.bold}${caseResult.name}${colors.reset} ${duration}`);

    // Print assertions
    for (const assertion of caseResult.assertions) {
      const aIcon = assertion.passed ? `${colors.green}·${colors.reset}` : `${colors.red}✕${colors.reset}`;
      const msgColor = assertion.passed ? colors.gray : colors.red;
      console.log(`    ${aIcon} ${msgColor}${assertion.message}${colors.reset}`);

      if (!assertion.passed && assertion.expected !== undefined) {
        console.log(`      ${colors.yellow}Expected: ${JSON.stringify(assertion.expected)}${colors.reset}`);
        console.log(`      ${colors.red}Actual:   ${JSON.stringify(assertion.actual)}${colors.reset}`);
      }
    }

    if (this.verbose && caseResult.rawResult) {
      console.log(`    ${colors.dim}Raw Output: ${JSON.stringify(caseResult.rawResult).slice(0, 160)}...${colors.reset}`);
    }

    console.log('');
  }

  printSummary(suiteResult) {
    console.log(`${colors.dim}─────────────────────────────────────────────────────────────────${colors.reset}`);
    if (suiteResult.error) {
      console.log(`  ${colors.bgRed} ERROR ${colors.reset} ${colors.red}${suiteResult.error}${colors.reset}\n`);
      return;
    }

    const total = suiteResult.totalTests;
    const passed = suiteResult.passedTests;
    const failed = suiteResult.failedTests;
    const duration = (suiteResult.durationMs / 1000).toFixed(2);

    const statusBadge = failed === 0
      ? `${colors.bgGreen} PASSED ${colors.reset}`
      : `${colors.bgRed} FAILED ${colors.reset}`;

    console.log(`\n  ${statusBadge} ${colors.bold}${passed}/${total} tests passed${colors.reset} ${colors.dim}in ${duration}s${colors.reset}`);

    if (suiteResult.serverInfo) {
      console.log(`  ${colors.gray}Server: ${suiteResult.serverInfo.name || 'unknown'} v${suiteResult.serverInfo.version || 'unknown'} (Protocol: ${suiteResult.protocolVersion || 'unknown'})${colors.reset}\n`);
    } else {
      console.log('');
    }
  }
}
