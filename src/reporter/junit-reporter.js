import fs from 'node:fs';
import path from 'node:path';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates JUnit XML string from SuiteResult
 * @param {import('../runner/test-runner.js').SuiteResult} suiteResult
 * @returns {string}
 */
export function generateJunitXml(suiteResult) {
  const timeSeconds = (suiteResult.durationMs / 1000).toFixed(3);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites name="mcp-probe" time="${timeSeconds}" tests="${suiteResult.totalTests}" failures="${suiteResult.failedTests}">\n`;
  xml += `  <testsuite name="${escapeXml(suiteResult.suiteName)}" tests="${suiteResult.totalTests}" failures="${suiteResult.failedTests}" errors="${suiteResult.error ? 1 : 0}" time="${timeSeconds}">\n`;

  if (suiteResult.error) {
    xml += `    <testcase classname="mcp.server" name="Initialization" time="0.000">\n`;
    xml += `      <error message="${escapeXml(suiteResult.error)}">${escapeXml(suiteResult.error)}</error>\n`;
    xml += `    </testcase>\n`;
  }

  for (const tc of suiteResult.testResults) {
    const tcTime = (tc.durationMs / 1000).toFixed(3);
    xml += `    <testcase classname="${escapeXml(tc.tool || tc.type)}" name="${escapeXml(tc.name)}" time="${tcTime}">\n`;

    if (!tc.passed) {
      const failedAssertions = tc.assertions.filter((a) => !a.passed);
      const message = tc.error || failedAssertions.map((a) => a.message).join('; ');
      xml += `      <failure message="${escapeXml(message)}">\n`;
      for (const a of failedAssertions) {
        xml += `        Assertion: ${escapeXml(a.name)}\n`;
        xml += `        Message: ${escapeXml(a.message)}\n`;
        if (a.expected !== undefined) {
          xml += `        Expected: ${escapeXml(JSON.stringify(a.expected))}\n`;
          xml += `        Actual:   ${escapeXml(JSON.stringify(a.actual))}\n`;
        }
      }
      xml += `      </failure>\n`;
    }

    xml += `    </testcase>\n`;
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;
  return xml;
}

/**
 * Writes JUnit XML to specified file path
 * @param {import('../runner/test-runner.js').SuiteResult} suiteResult
 * @param {string} outputPath
 */
export function writeJunitReport(suiteResult, outputPath) {
  const resolved = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, generateJunitXml(suiteResult), 'utf-8');
}
