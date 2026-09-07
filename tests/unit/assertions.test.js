import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAssertions,
  validateJsonSchema,
  deepEqual,
  containsSubset,
  extractTextContent
} from '../../src/runner/assertions.js';

describe('Assertions Engine Unit Tests', () => {
  test('extractTextContent combines text blocks', () => {
    const result = {
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'image', data: 'abc' },
        { type: 'text', text: 'World' }
      ]
    };
    assert.equal(extractTextContent(result), 'Hello\nWorld');
  });

  test('validateJsonSchema checks valid schema', () => {
    const validSchema = {
      type: 'object',
      properties: {
        num: { type: 'number' }
      },
      required: ['num']
    };
    const res = validateJsonSchema(validSchema);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  test('validateJsonSchema detects invalid schemas', () => {
    const invalidSchema = {
      type: 'string', // top level should be object
      properties: 'not-an-object',
      required: 'not-an-array'
    };
    const res = validateJsonSchema(invalidSchema);
    assert.equal(res.valid, false);
    assert.equal(res.errors.length, 3);
  });

  test('deepEqual checks primitive and nested structures', () => {
    assert.equal(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }), true);
    assert.equal(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 4] }), false);
    assert.equal(deepEqual(null, null), true);
    assert.equal(deepEqual(null, undefined), false);
  });

  test('containsSubset checks partial matching', () => {
    const target = { a: 1, b: 2, c: { d: 3, e: 4 } };
    assert.equal(containsSubset(target, { a: 1, c: { d: 3 } }), true);
    assert.equal(containsSubset(target, { a: 1, c: { d: 5 } }), false);
  });

  test('evaluateAssertions handles content_contains and latency', () => {
    const testCase = {
      expect: {
        error: false,
        content_contains: 'Result: 42',
        max_duration_ms: 100
      }
    };
    const toolResult = {
      content: [{ type: 'text', text: 'Operation finished. Result: 42' }],
      isError: false,
      durationMs: 45
    };

    const evaluated = evaluateAssertions(testCase, toolResult);
    assert.equal(evaluated.length, 3);
    assert.ok(evaluated.every((a) => a.passed));
  });

  test('evaluateAssertions fails when substring is missing', () => {
    const testCase = {
      expect: {
        content_contains: 'MissingSubstring'
      }
    };
    const toolResult = {
      content: [{ type: 'text', text: 'Hello World' }],
      isError: false
    };

    const evaluated = evaluateAssertions(testCase, toolResult);
    const containsAssertion = evaluated.find((a) => a.name.startsWith('content_contains'));
    assert.equal(containsAssertion.passed, false);
  });

  test('evaluateAssertions checks expected error', () => {
    const testCase = {
      expect: {
        error: true,
        content_contains: 'Invalid input'
      }
    };
    const toolResult = {
      content: [{ type: 'text', text: 'Error: Invalid input provided' }],
      isError: true
    };

    const evaluated = evaluateAssertions(testCase, toolResult);
    assert.ok(evaluated.every((a) => a.passed));
  });

  test('evaluateAssertions parses and asserts on JSON output', () => {
    const testCase = {
      expect: {
        content_json: { status: 'success', code: 200 }
      }
    };
    const toolResult = {
      content: [{ type: 'text', text: JSON.stringify({ status: 'success', code: 200, extra: 'info' }) }],
      isError: false
    };

    const evaluated = evaluateAssertions(testCase, toolResult);
    assert.ok(evaluated.every((a) => a.passed));
  });
});
