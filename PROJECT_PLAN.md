# Project Plan: mcp-probe

## Problem
The Model Context Protocol (MCP) has rapidly become the standard open protocol for connecting AI assistants (such as Claude, Cursor, Antigravity, Cline) with external tools, prompts, and data sources. 

However, developer tooling around MCP testing and CI/CD remains severely lacking:
1. **No Automated Testing Framework**: Developers currently test MCP servers manually by launching desktop apps (Claude Desktop) or running heavy graphical web inspectors.
2. **No CI/CD Integration**: There is no standard CLI tool to run headless test suites against MCP servers in GitHub Actions or automated test pipelines.
3. **Spec Drift & Silent Breakages**: Changes to tool parameters, JSON schemas, or return formats often silently break AI agent tool calling without early warning.
4. **Latency & Reliability Blindness**: Developers lack easy ways to assert execution time benchmarks and error handling behaviors across tools.

## Target Users
- **MCP Server Developers**: Engineers building MCP servers in Node.js, Python, Go, Rust, C#, or any other language.
- **AI Agent Engineers**: Teams building agentic pipelines that rely on stable MCP tool interfaces.
- **DevOps / CI Engineers**: Teams looking to add automated regression testing for MCP tool servers in GitHub Actions or GitLab CI.

## Solution
mcp-probe is a fast, zero-dependency, automated CLI test runner and specification validator for Model Context Protocol (MCP) servers. It provides:
1. mcp-probe inspect: Instant stdio/process inspection, schema validation, and formatted terminal overview of tools, resources, and prompts.
2. mcp-probe call: Quick manual or scriptable tool invocation with JSON args and latency measurement.
3. mcp-probe test: Automated declarative test runner reading mcp-test.json or YAML-equivalent suites, executing assertions against schemas, tool calls, return values, errors, and latency limits.
4. mcp-probe init: Quickstart command to bootstrap test suites for any server.
5. **CI Ready**: Native support for JUnit XML test reports and Markdown reports, with standard Unix exit codes.

## Core Features (MVP)
- **Protocol Client Engine**: High-performance JSON-RPC 2.0 stdio client handling handshake, capabilities negotiation, message framing, timeouts, and process lifecycle management.
- **Spec Validator**: Validates that MCP server responses conform to the Model Context Protocol specification (protocol version, tools/list, inputSchema, isError, content structure).
- **Assertion Engine**:
  - status: asserts tool call success or expected failure (isError: false or isError: true).
  - schema: verifies that input arguments and tool return values adhere to valid JSON Schema.
  - content: regex matching, substring matching, or exact JSON equality on returned text/json content.
  - duration_ms: latency threshold assertion (e.g. <= 1000ms).
- **CLI Interface**: Built with clean subcommands (inspect, call, test, init) and colorful, expressive terminal reporting.
- **Multiple Output Formats**: Human-readable terminal logs, JSON summary, JUnit XML for CI test reporting, and Markdown reports.
- **Built-in Mock Server Fixture**: Allows self-testing and gives developers an immediate out-of-the-box working demo.

## Non-goals (for MVP)
- Not a replacement for the full web graphical MCP Inspector (no browser UI needed).
- Remote SSE / Streamable HTTP transports will be stubbed or added in v1.1; MVP focuses on local stdio (which represents 90%+ of developer MCP servers).
- Not an LLM prompt evaluation framework (evaluating model intelligence); this tests the *protocol and server implementation* deterministically.

## Architecture
\\\
mcp-probe/
├── bin/
│   └── mcp-probe.js            # Executable CLI entrypoint
├── src/
│   ├── index.js                # Library exports (programmatic API)
│   ├── client/
│   │   ├── stdio-client.js     # JSON-RPC 2.0 stdio client & process manager
│   │   └── protocol.js         # MCP message types & constants
│   ├── runner/
│   │   ├── suite-loader.js     # Parses and validates mcp-test.json test suites
│   │   ├── assertions.js       # Assertion logic (content, schema, latency, error)
│   │   └── test-runner.js      # Executes test suites with timeout & lifecycle hooks
│   ├── reporter/
│   │   ├── console-reporter.js # Colorized terminal test reporter with diffs
│   │   ├── junit-reporter.js   # JUnit XML reporter for CI/CD
│   │   └── markdown-reporter.js# Markdown summary generator
│   └── cli/
│       ├── commands/
│       │   ├── inspect.js      # CLI command: inspect server tools & schemas
│       │   ├── call.js         # CLI command: call a tool and display output
│       │   ├── test.js         # CLI command: run test suite
│       │   └── init.js         # CLI command: scaffold new test suite
│       └── parser.js           # Lightweight zero-dependency CLI arg parser
├── tests/
│   ├── fixtures/
│   │   ├── mock-mcp-server.js  # Reliable mock MCP server for testing
│   │   └── sample-suite.json   # Test suite definition
│   ├── unit/                   # Unit tests for client, assertions, parser
│   └── e2e/                    # End-to-end CLI tests
└── examples/
    └── weather-server/         # Working demo MCP server with test suite
\\\

## Tech Stack
- **Runtime**: Node.js (v18+ compatible, runs on Node 22 native ESM)
- **Zero Heavy Runtime Dependencies**: High performance, instant startup, no vulnerabilities or version conflicts.
- **Testing**: Native node:test and node:assert for unit and E2E verification.
- **Packaging**: Standard npm package with bin executable.

## Implementation Plan
1. **Scaffolding & Core Architecture**: Initialize package.json, .gitignore, LICENSE (MIT).
2. **MCP Client & Protocol Layer**: Implement stdio-client.js with robust JSON-RPC 2.0 framing, stderr streaming, request timeouts, and clean child process shutdown.
3. **CLI Parser & Commands**: Implement parser and subcommands (inspect, call, test, init).
4. **Test Runner & Assertion Engine**: Implement suite loader, assertion engine, test runner.
5. **Reporters**: Implement console, JUnit XML, and Markdown reporters.
6. **Testing & Verification**: Unit, integration, and E2E tests with mock MCP server.
7. **Documentation, Polish & Release**: README.md, git init, GitHub repository creation & push.

## Testing Strategy
- Unit Tests: Assertions, CLI parser, suite validation.
- Integration Tests: stdio client with mock MCP server.
- E2E CLI Tests: Full execution of all CLI commands with various flags and exit code verification.

## Acceptance Criteria
- Full MVP executable via node bin/mcp-probe.js and npx mcp-probe.
- All 4 core subcommands functional: inspect, call, test, init.
- Unit, integration, and E2E test suite passes 100%.
- Zero external runtime dependencies.
- Published to GitHub under baicai0131/mcp-probe.

## Future Improvements
- SSE / HTTP Stream transport support.
- Interactive TUI mode.
- Automatic fuzz testing of MCP tools based on inputSchema.
