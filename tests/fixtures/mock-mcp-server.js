import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req;
  try {
    req = JSON.parse(trimmed);
  } catch (err) {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }

  // Handle notifications (no id)
  if (req.id === undefined) {
    return;
  }

  const { id, method, params } = req;

  switch (method) {
    case 'initialize': {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'mock-math-server',
            version: '1.2.0'
          }
        }
      });
      break;
    }

    case 'ping': {
      send({ jsonrpc: '2.0', id, result: {} });
      break;
    }

    case 'tools/list': {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'calculate',
              description: 'Performs basic arithmetic operations',
              inputSchema: {
                type: 'object',
                properties: {
                  operation: { type: 'string', enum: ['add', 'subtract', 'multiply'] },
                  a: { type: 'number', description: 'First number' },
                  b: { type: 'number', description: 'Second number' }
                },
                required: ['operation', 'a', 'b']
              }
            },
            {
              name: 'echo',
              description: 'Echoes structured JSON data',
              inputSchema: {
                type: 'object',
                properties: {
                  payload: { type: 'object', description: 'Data to echo' }
                },
                required: ['payload']
              }
            },
            {
              name: 'error_trigger',
              description: 'Always returns an error for negative testing',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        }
      });
      break;
    }

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'calculate') {
        const { operation, a, b } = args;
        if (typeof a !== 'number' || typeof b !== 'number') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'Error: parameters a and b must be numbers' }],
              isError: true
            }
          });
          return;
        }

        let resVal;
        if (operation === 'add') resVal = a + b;
        else if (operation === 'subtract') resVal = a - b;
        else if (operation === 'multiply') resVal = a * b;
        else {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Error: unknown operation '${operation}'` }],
              isError: true
            }
          });
          return;
        }

        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Result: ${resVal}` }],
            isError: false
          }
        });
        return;
      }

      if (toolName === 'echo') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(args.payload) }],
            isError: false
          }
        });
        return;
      }

      if (toolName === 'error_trigger') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: 'Operation failed intentionally' }],
            isError: true
          }
        });
        return;
      }

      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` }
      });
      break;
    }

    case 'resources/list': {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'config://settings',
              name: 'Application Settings',
              mimeType: 'application/json'
            }
          ]
        }
      });
      break;
    }

    case 'resources/read': {
      const uri = params?.uri;
      if (uri === 'config://settings') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ environment: 'production', debug: false })
              }
            ]
          }
        });
      } else {
        send({
          jsonrpc: '2.0',
          id,
          error: { code: -32002, message: `Resource not found: ${uri}` }
        });
      }
      break;
    }

    default:
      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      });
  }
});
