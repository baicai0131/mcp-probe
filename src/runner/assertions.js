/**
 * Assertion Engine for MCP Test Runner
 */

export class AssertionResult {
  constructor(name, passed, message, expected = undefined, actual = undefined) {
    this.name = name;
    this.passed = passed;
    this.message = message;
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Extracts combined text content from MCP result
 * @param {object} result - MCP tool call result
 * @returns {string}
 */
export function extractTextContent(result) {
  if (!result || !Array.isArray(result.content)) {
    return '';
  }
  return result.content
    .filter((item) => item && (item.type === 'text' || typeof item.text === 'string'))
    .map((item) => item.text || '')
    .join('\n');
}

/**
 * Validates a tool's input schema against basic JSON Schema rules
 * @param {object} inputSchema
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateJsonSchema(inputSchema) {
  const errors = [];
  if (!inputSchema || typeof inputSchema !== 'object') {
    return { valid: false, errors: ['inputSchema must be an object'] };
  }

  if (inputSchema.type && inputSchema.type !== 'object') {
    errors.push(`inputSchema top-level type should be 'object', got '${inputSchema.type}'`);
  }

  if (inputSchema.properties && typeof inputSchema.properties !== 'object') {
    errors.push(`inputSchema.properties must be an object`);
  }

  if (inputSchema.required && !Array.isArray(inputSchema.required)) {
    errors.push(`inputSchema.required must be an array of property names`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Deep equality helper
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Checks if target object contains subset of expected properties
 */
export function containsSubset(target, expected) {
  if (target === expected) return true;
  if (target == null || expected == null) return false;

  if (typeof expected !== 'object') {
    return target === expected;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(target)) return false;
    return expected.every((expItem) =>
      target.some((targetItem) => containsSubset(targetItem, expItem))
    );
  }

  for (const key of Object.keys(expected)) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) return false;
    if (!containsSubset(target[key], expected[key])) return false;
  }

  return true;
}

/**
 * Evaluates test case assertions against tool call result
 * @param {object} testCase - The test case definition
 * @param {object} result - The tool call result
 * @returns {AssertionResult[]}
 */
export function evaluateAssertions(testCase, result) {
  const assertions = testCase.expect || {};
  const results = [];
  const textContent = extractTextContent(result);
  const isError = Boolean(result.isError);

  // 1. Status / Error assertion
  if (assertions.error !== undefined) {
    const expectError = Boolean(assertions.error);
    const passed = isError === expectError;
    results.push(new AssertionResult(
      'status.error',
      passed,
      passed ? `Tool isError status matches expectation (${expectError})` : `Expected isError to be ${expectError}, but got ${isError}`,
      expectError,
      isError
    ));
  } else if (!isError) {
    results.push(new AssertionResult(
      'status.success',
      true,
      'Tool executed successfully (isError: false)',
      false,
      false
    ));
  } else {
    results.push(new AssertionResult(
      'status.success',
      false,
      `Tool returned an error (isError: true): ${textContent.slice(0, 150)}`,
      false,
      true
    ));
  }

  // 2. Content contains assertion
  if (assertions.content_contains !== undefined) {
    const list = Array.isArray(assertions.content_contains)
      ? assertions.content_contains
      : [assertions.content_contains];

    for (const expectedSub of list) {
      const passed = textContent.includes(expectedSub);
      results.push(new AssertionResult(
        `content_contains("${expectedSub}")`,
        passed,
        passed ? `Content contains expected substring` : `Content missing expected substring "${expectedSub}"`,
        expectedSub,
        textContent.length > 80 ? textContent.slice(0, 80) + '...' : textContent
      ));
    }
  }

  // 3. Content matches regex assertion
  if (assertions.content_matches !== undefined) {
    const list = Array.isArray(assertions.content_matches)
      ? assertions.content_matches
      : [assertions.content_matches];

    for (const pattern of list) {
      try {
        const regex = new RegExp(pattern);
        const passed = regex.test(textContent);
        results.push(new AssertionResult(
          `content_matches(/${pattern}/)`,
          passed,
          passed ? `Content matched regex /${pattern}/` : `Content did not match regex /${pattern}/`,
          pattern,
          textContent.length > 80 ? textContent.slice(0, 80) + '...' : textContent
        ));
      } catch (err) {
        results.push(new AssertionResult(
          `content_matches(/${pattern}/)`,
          false,
          `Invalid regex pattern: ${err.message}`
        ));
      }
    }
  }

  // 4. Content JSON assertion
  if (assertions.content_json !== undefined) {
    let parsed = null;
    let parseError = null;
    try {
      parsed = JSON.parse(textContent);
    } catch (err) {
      parseError = err.message;
    }

    if (parseError) {
      results.push(new AssertionResult(
        'content_json',
        false,
        `Expected valid JSON content, but failed to parse: ${parseError}`,
        assertions.content_json,
        textContent
      ));
    } else {
      const matchExact = assertions.content_json_exact ?? false;
      const passed = matchExact
        ? deepEqual(parsed, assertions.content_json)
        : containsSubset(parsed, assertions.content_json);

      results.push(new AssertionResult(
        matchExact ? 'content_json (exact)' : 'content_json (subset)',
        passed,
        passed ? 'JSON response matches expectations' : 'JSON response does not match expected structure',
        assertions.content_json,
        parsed
      ));
    }
  }

  // 5. Max duration / Latency assertion
  if (typeof assertions.max_duration_ms === 'number') {
    const duration = result.durationMs ?? 0;
    const passed = duration <= assertions.max_duration_ms;
    results.push(new AssertionResult(
      `max_duration_ms (${assertions.max_duration_ms}ms)`,
      passed,
      passed
        ? `Execution time ${duration}ms <= ${assertions.max_duration_ms}ms`
        : `Execution time ${duration}ms exceeded limit of ${assertions.max_duration_ms}ms`,
      `<= ${assertions.max_duration_ms}ms`,
      `${duration}ms`
    ));
  }

  return results;
}
