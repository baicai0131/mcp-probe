import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli/parser.js';
import { splitCommand } from '../../src/client/stdio-client.js';

describe('CLI Parser Unit Tests', () => {
  test('parses basic command and positional args', () => {
    const res = parseArgs(['test', 'suite.json']);
    assert.equal(res.command, 'test');
    assert.deepEqual(res.positionals, ['suite.json']);
  });

  test('parses long options with value', () => {
    const res = parseArgs(['call', '--server', 'node server.js', '--tool', 'calculate']);
    assert.equal(res.command, 'call');
    assert.equal(res.options.server, 'node server.js');
    assert.equal(res.options.tool, 'calculate');
  });

  test('parses long options with = syntax', () => {
    const res = parseArgs(['test', '--timeout=5000', '--server="python app.py"']);
    assert.equal(res.command, 'test');
    assert.equal(res.options.timeout, '5000');
    assert.equal(res.options.server, '"python app.py"');
  });

  test('parses boolean flags and short flags', () => {
    const res = parseArgs(['inspect', '-v', '-h', '--server', 'node s.js']);
    assert.equal(res.command, 'inspect');
    assert.equal(res.options.verbose, true);
    assert.equal(res.options.help, true);
    assert.equal(res.options.server, 'node s.js');
  });

  test('handles double dash -- separator', () => {
    const res = parseArgs(['test', '--server', 'node s.js', '--', 'extra1', 'extra2']);
    assert.equal(res.command, 'test');
    assert.equal(res.options.server, 'node s.js');
    assert.deepEqual(res.positionals, ['extra1', 'extra2']);
  });

  test('splitCommand splits arguments while preserving quoted values', () => {
    assert.deepEqual(splitCommand('node ./server.js'), ['node', './server.js']);
    assert.deepEqual(
      splitCommand('node "/path with spaces/server.js" --flag'),
      ['node', '/path with spaces/server.js', '--flag']
    );
    assert.deepEqual(
      splitCommand("python 'my server.py'"),
      ['python', 'my server.py']
    );
    assert.deepEqual(splitCommand(''), []);
  });
});
