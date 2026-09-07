import { loadSuite } from '../../runner/suite-loader.js';
import { runSuite } from '../../runner/test-runner.js';
import { ConsoleReporter } from '../../reporter/console-reporter.js';
import { writeJunitReport } from '../../reporter/junit-reporter.js';
import { writeMarkdownReport } from '../../reporter/markdown-reporter.js';

export async function runTest(suitePathArg, options) {
  const suitePath = suitePathArg || options.suite || 'mcp-test.json';

  let suite;
  try {
    suite = loadSuite(suitePath, {
      serverCommand: options.server,
      timeout: options.timeout ? Number(options.timeout) : undefined
    });
  } catch (err) {
    console.error(`\x1b[31mError loading test suite:\x1b[0m ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const reporter = new ConsoleReporter({ verbose: options.verbose });
  reporter.printHeader(suite);

  const suiteResult = await runSuite(suite, {
    verbose: options.verbose,
    onTestEnd: (caseResult) => {
      reporter.printTestResult(caseResult);
    }
  });

  reporter.printSummary(suiteResult);

  // JUnit report
  if (options['report-junit']) {
    try {
      writeJunitReport(suiteResult, options['report-junit']);
      console.log(`  \x1b[90mGenerated JUnit report: ${options['report-junit']}\x1b[0m`);
    } catch (err) {
      console.error(`  \x1b[31mFailed to write JUnit report: ${err.message}\x1b[0m`);
    }
  }

  // Markdown report
  if (options['report-markdown']) {
    try {
      writeMarkdownReport(suiteResult, options['report-markdown']);
      console.log(`  \x1b[90mGenerated Markdown report: ${options['report-markdown']}\x1b[0m\n`);
    } catch (err) {
      console.error(`  \x1b[31mFailed to write Markdown report: ${err.message}\x1b[0m\n`);
    }
  }

  if (suiteResult.failedTests > 0 || suiteResult.error) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
