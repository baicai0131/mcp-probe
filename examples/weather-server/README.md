# Weather MCP Server Example

This example demonstrates how to build and test a Model Context Protocol (MCP) server using `mcp-probe`.

## Quick Start

### 1. Inspect Server
Inspect the server capabilities, tools, and schemas:

```bash
npx mcp-probe inspect --server "node ./server.js"
```

### 2. Manually Call a Tool
Call the `get_current_weather` tool with arguments:

```bash
npx mcp-probe call --server "node ./server.js" --tool get_current_weather --args '{"city":"Tokyo","unit":"celsius"}'
```

### 3. Run Automated Test Suite
Execute the full test suite and output both terminal results and CI reports:

```bash
npx mcp-probe test ./mcp-test.json --report-markdown ./summary.md
```
