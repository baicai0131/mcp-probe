# mcp-probe

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Specification](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A fast, zero-dependency CLI test runner and specification validator for Model Context Protocol (MCP) servers.**

---

## Overview

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is the industry open standard connecting AI models to tools, resources, and external data sources.

While building MCP servers has become straightforward, **testing and validating them in CI/CD has remained painful**:
- Developers frequently rely on manual GUI inspectors or desktop client connections.
- Silent breakages in tool schemas and return payloads slip into production.
- CI/CD pipelines lack a lightweight, headless test runner with standard exit codes and test reports.

`mcp-probe` solves this with a **fast, zero-runtime-dependency CLI test framework** that brings automated testing, schema verification, and latency assertions to any MCP server (Node.js, Python, Go, Rust, C#, binary).

---

## Features

- **🚀 Headless & Zero External Dependencies**: Native Node.js ESM. Instant startup with zero bloated dependency trees.
- **🔍 Comprehensive Inspection**: Connect to any MCP server over `stdio` and instantly inspect advertised tools, schema properties, resources, and prompt templates.
- **⚡ Interactive Tool Calls**: Invoke tools on the command line with JSON parameters, pretty-printed outputs, and precise latency benchmarks.
- **🧪 Declarative Test Suites**: Write clean, declarative `mcp-test.json` test suites asserting tool outputs, error responses, JSON structures, and performance bounds.
- **📊 Rich CI/CD Reporting**: Native support for **JUnit XML** (for GitHub Actions test summaries) and **GitHub-Flavored Markdown** summaries.
- **🛡️ Spec Conformance Checks**: Automatically verifies JSON Schema Draft 7/2020-12 compliance for input schemas to prevent AI agents from encountering malformed parameters.

---

## Demo

```bash
# 1. Quick inspection of any MCP server
$ npx mcp-probe inspect --server "python my_server.py"

# 2. Invoke a tool directly
$ npx mcp-probe call --server "node server.js" --tool calculate --args '{"operation":"add","a":15,"b":27}'

# 3. Run automated regression tests in CI
$ npx mcp-probe test mcp-test.json --report-junit ./junit.xml --report-markdown ./summary.md
```

Terminal output:
```text
▶ MCP Probe Test Suite: Weather MCP Server Test Suite
  Validation and integration test suite for Weather MCP Server
  Target server: node ./server.js

  ✓ PASS Schema: Ensure weather tools adhere to JSON Schema (2ms)
    · Valid inputSchema for get_current_weather

  ✓ PASS Weather: Get weather for Tokyo in Celsius (1ms)
    · Tool isError status matches expectation (false)
    · JSON response matches expectations
    · Execution time 1ms <= 1000ms

  ✓ PASS Weather: Get weather for New York in Fahrenheit (1ms)
    · Tool isError status matches expectation (false)
    · JSON response matches expectations

  ✓ PASS Error: Unknown city handling (1ms)
    · Tool isError status matches expectation (true)
    · Content contains expected substring

─────────────────────────────────────────────────────────────────

   PASSED  4/4 tests passed in 0.12s
  Server: weather-service v1.0.0 (Protocol: 2024-11-05)
```

---

## Installation

### Run without installing (recommended):
```bash
npx mcp-probe --help
```

### Or install globally:
```bash
npm install -g mcp-probe
```

### Or add to your project:
```bash
npm install --save-dev mcp-probe
```

---

## Quick Start

### 1. Scaffold a Starter Test Suite
Generate a template `mcp-test.json` in your project root:

```bash
mcp-probe init
```

### 2. Run the Suite
```bash
mcp-probe test mcp-test.json
```

---

## Usage

### Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `inspect` | Inspect capabilities, tools, schemas, and resources | `mcp-probe inspect --server "node server.js"` |
| `call` | Execute a tool with parameters and measure latency | `mcp-probe call --server "node server.js" --tool add --args '{"a":1,"b":2}'` |
| `test` | Run an automated test suite file | `mcp-probe test mcp-test.json` |
| `init` | Scaffold a starter `mcp-test.json` configuration | `mcp-probe init [path]` |

### CLI Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--server <cmd>` | Command to start the MCP server | Taken from suite |
| `--tool <name>` | Tool name to call (for `call` command) | - |
| `--args <json>` | JSON arguments passed to tool | `{}` |
| `--timeout <ms>` | Timeout per JSON-RPC request in milliseconds | `10000` |
| `--report-junit <file>` | Path to output JUnit XML test report | - |
| `--report-markdown <file>` | Path to output GitHub Markdown report | - |
| `-v, --verbose` | Show raw RPC messages and server stderr | `false` |
| `-h, --help` | Display help instructions | - |
| `--version` | Display version number | - |

---

## Configuration (`mcp-test.json`)

Test suites are written in simple, readable JSON.

```json
{
  "name": "Math & Data MCP Server Suite",
  "description": "Integration and spec conformance tests",
  "server": {
    "command": "python server.py",
    "timeout": 5000
  },
  "tests": [
    {
      "name": "Verify all tools conform to JSON Schema",
      "type": "schema_validation"
    },
    {
      "name": "Tool: calculate addition",
      "type": "tool_call",
      "tool": "calculate",
      "args": {
        "operation": "add",
        "a": 15,
        "b": 27
      },
      "expect": {
        "error": false,
        "content_contains": "42",
        "max_duration_ms": 500
      }
    },
    {
      "name": "Tool: verify structured JSON response",
      "type": "tool_call",
      "tool": "get_user",
      "args": { "id": 101 },
      "expect": {
        "error": false,
        "content_json": {
          "status": "active",
          "role": "admin"
        }
      }
    },
    {
      "name": "Error handling: invalid argument returns error",
      "type": "tool_call",
      "tool": "calculate",
      "args": { "operation": "divide_by_zero" },
      "expect": {
        "error": true,
        "content_contains": "Division by zero is not allowed"
      }
    },
    {
      "name": "Resource: verify system settings read",
      "type": "resource_check",
      "uri": "config://settings",
      "expect": {
        "content_contains": "production"
      }
    }
  ]
}
```

### Supported Assertions

- **`error: boolean`**: Asserts whether `result.isError` is `true` (for expected negative cases) or `false` (for normal execution).
- **`content_contains: string | string[]`**: Substrings that must be present in returned text content.
- **`content_matches: string | string[]`**: Regular expressions that output text must match.
- **`content_json: object`**: Asserts returned text parses as JSON and contains the expected subset of keys and values.
- **`content_json_exact: boolean`**: If `true`, requires exact deep equality for `content_json`.
- **`max_duration_ms: number`**: Latency threshold in milliseconds. Fails the test if tool execution exceeds this limit.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                       mcp-probe                        │
├───────────────┬──────────────────────┬─────────────────┤
│   CLI Layer   │    Test Engine       │    Reporters    │
│  - inspect    │  - JSON-RPC 2.0      │  - Terminal     │
│  - call       │  - stdio Client      │  - JUnit XML    │
│  - test       │  - Assertions Engine │  - Markdown     │
│  - init       │  - Schema Validator  │                 │
└───────┬───────┴──────────┬───────────┴─────────────────┘
        │ stdio            │ stdio
        ▼                  ▼
┌──────────────────┐ ┌───────────────────┐
│  Node MCP Server │ │ Python MCP Server │ (or Rust, Go, C#)
└──────────────────┘ └───────────────────┘
```

---

## CI / GitHub Actions Integration

Add `mcp-probe` to your GitHub Actions workflow for automated regression checks on every push or pull request:

```yaml
name: Test MCP Server

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run MCP Test Suite
        run: |
          npx mcp-probe test mcp-test.json \
            --report-junit test-results/junit.xml \
            --report-markdown test-results/summary.md

      - name: Publish Test Summary
        if: always()
        run: cat test-results/summary.md >> $GITHUB_STEP_SUMMARY
```

---

## Examples

Check the [`examples/weather-server`](examples/weather-server) directory for a complete, runnable MCP server and test suite.

---

## Development

```bash
# Clone the repository
git clone https://github.com/baicai0131/mcp-probe.git
cd mcp-probe

# Run tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E CLI tests
npm run test:e2e
```

---

## Testing Strategy

- **Unit Tests (`tests/unit/`)**: Verify CLI argument parsing, assertion rules, JSON deep equality, and schema validation logic.
- **Integration Tests (`tests/integration/`)**: Test end-to-end `StdioClient` JSON-RPC 2.0 handshake, process framing, timeouts, and error propagation with mock servers.
- **E2E Tests (`tests/e2e/`)**: Execute compiled CLI commands in isolated child processes and verify exit codes, report generation, and terminal formatting.

---

## Roadmap

- [x] Full JSON-RPC 2.0 stdio client
- [x] `inspect`, `call`, `test`, `init` CLI commands
- [x] Schema validation for advertised tools
- [x] JUnit XML & GitHub Markdown reporters
- [ ] SSE (Server-Sent Events) transport support for remote MCP servers
- [ ] Interactive TUI mode for exploring MCP servers
- [ ] Automated property-based fuzzing of tools based on `inputSchema`

---

## Contributing

Contributions are warmly welcome! Please feel free to open issues or submit pull requests.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
