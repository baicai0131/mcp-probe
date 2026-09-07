import { spawn } from 'node:child_process';
import {
  JSONRPC_VERSION,
  CLIENT_INFO,
  LATEST_PROTOCOL_VERSION,
  MCP_METHODS
} from './protocol.js';

/**
 * Tokenizes a command string into arguments while respecting double and single quotes
 * @param {string} cmdStr
 * @returns {string[]}
 */
export function splitCommand(cmdStr) {
  if (!cmdStr || typeof cmdStr !== 'string') return [];
  const tokens = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < cmdStr.length; i++) {
    const char = cmdStr[i];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if ((char === ' ' || char === '\t') && !inDouble && !inSingle) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

export class StdioClient {
  /**
   * @param {object} options
   * @param {string} options.command - The executable command or full command line
   * @param {string[]} [options.args] - Optional command arguments (if command is just executable)
   * @param {Record<string, string>} [options.env] - Environment variables
   * @param {string} [options.cwd] - Working directory
   * @param {number} [options.timeout] - Default request timeout in milliseconds (default: 10000)
   * @param {boolean} [options.verbose] - Enable verbose stderr output
   */
  constructor(options) {
    this.command = options.command;
    this.args = options.args || [];
    this.env = options.env || {};
    this.cwd = options.cwd || process.cwd();
    this.defaultTimeout = options.timeout || 10000;
    this.verbose = Boolean(options.verbose);

    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.buffer = '';
    this.stderrLogs = [];
    this.initialized = false;
    this.serverCapabilities = null;
    this.serverInfo = null;
  }

  /**
   * Spawns the server child process
   */
  start() {
    if (this.process) {
      return this;
    }

    const isWindows = process.platform === 'win32';
    const tokens = splitCommand(this.command);
    const execCmd = tokens[0] || this.command;
    const execArgs = [...tokens.slice(1), ...this.args];

    const spawnOptions = {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows ? true : false
    };

    this.process = spawn(execCmd, execArgs, spawnOptions);

    this.process.stdout.on('data', (chunk) => {
      this._handleData(chunk.toString('utf-8'));
    });

    this.process.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf-8');
      this.stderrLogs.push(text);
      if (this.verbose) {
        process.stderr.write(`[server:stderr] ${text}`);
      }
    });

    this.process.on('error', (err) => {
      this._cleanupPending(new Error(`Failed to start MCP server: ${err.message}`));
    });

    this.process.on('exit', (code, signal) => {
      const reason = `Server process exited with code ${code}${signal ? ` (signal ${signal})` : ''}`;
      this._cleanupPending(new Error(reason));
      this.process = null;
    });

    return this;
  }

  /**
   * Internal data handler buffering lines
   * @param {string} text
   */
  _handleData(text) {
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop(); // Keep uncompleted line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let message;
      try {
        message = JSON.parse(trimmed);
      } catch (err) {
        // Stdio might contain non-JSON log messages, ignore or log
        if (this.verbose) {
          process.stderr.write(`[client:non-json] ${trimmed}\n`);
        }
        continue;
      }

      if (message.id !== undefined && this.pendingRequests.has(message.id)) {
        const { resolve, reject, timer } = this.pendingRequests.get(message.id);
        clearTimeout(timer);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          const err = new Error(message.error.message || 'JSON-RPC error');
          err.code = message.error.code;
          err.data = message.error.data;
          reject(err);
        } else {
          resolve(message.result);
        }
      }
    }
  }

  /**
   * Reject all pending requests
   */
  _cleanupPending(err) {
    for (const [, { reject, timer }] of this.pendingRequests) {
      clearTimeout(timer);
      reject(err);
    }
    this.pendingRequests.clear();
  }

  /**
   * Sends a JSON-RPC request and returns a Promise
   * @param {string} method
   * @param {object} [params]
   * @param {number} [timeoutMs]
   * @returns {Promise<any>}
   */
  request(method, params = {}, timeoutMs) {
    if (!this.process || this.process.killed) {
      return Promise.reject(new Error('MCP server process is not running'));
    }

    const id = ++this.requestId;
    const timeout = timeoutMs ?? this.defaultTimeout;

    const payload = JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      id,
      method,
      params
    }) + '\n';

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request '${method}' (id: ${id}) timed out after ${timeout}ms`));
        }
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.process.stdin.write(payload, 'utf-8');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Sends a JSON-RPC notification
   * @param {string} method
   * @param {object} [params]
   */
  notify(method, params = {}) {
    if (!this.process || this.process.killed) {
      return;
    }

    const payload = JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      method,
      params
    }) + '\n';

    this.process.stdin.write(payload, 'utf-8');
  }

  /**
   * Performs standard MCP initialize handshake
   * @param {object} [clientOptions]
   * @returns {Promise<{ protocolVersion: string, capabilities: object, serverInfo: object }>}
   */
  async initialize(clientOptions = {}) {
    if (!this.process) {
      this.start();
    }

    const initResult = await this.request(MCP_METHODS.INITIALIZE, {
      protocolVersion: clientOptions.protocolVersion || LATEST_PROTOCOL_VERSION,
      capabilities: clientOptions.capabilities || {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: clientOptions.clientInfo || CLIENT_INFO
    });

    this.serverCapabilities = initResult.capabilities || {};
    this.serverInfo = initResult.serverInfo || {};
    this.protocolVersion = initResult.protocolVersion;
    this.initialized = true;

    // Send initialized notification
    this.notify(MCP_METHODS.INITIALIZED_NOTIFICATION, {});

    return initResult;
  }

  /**
   * Lists tools provided by the MCP server
   * @returns {Promise<Array<{ name: string, description?: string, inputSchema?: object }>>}
   */
  async listTools() {
    const res = await this.request(MCP_METHODS.TOOLS_LIST, {});
    return res?.tools || [];
  }

  /**
   * Calls a tool
   * @param {string} name
   * @param {object} [args]
   * @param {number} [timeoutMs]
   * @returns {Promise<{ content: Array<{ type: string, text?: string, data?: string }>, isError?: boolean, durationMs: number }>}
   */
  async callTool(name, args = {}, timeoutMs) {
    const startTime = performance.now();
    const result = await this.request(MCP_METHODS.TOOLS_CALL, {
      name,
      arguments: args
    }, timeoutMs);
    const durationMs = Math.round(performance.now() - startTime);

    return {
      ...result,
      durationMs
    };
  }

  /**
   * Lists resources provided by the MCP server
   */
  async listResources() {
    const res = await this.request(MCP_METHODS.RESOURCES_LIST, {});
    return res?.resources || [];
  }

  /**
   * Reads a resource
   * @param {string} uri
   */
  async readResource(uri) {
    const res = await this.request(MCP_METHODS.RESOURCES_READ, { uri });
    return res?.contents || [];
  }

  /**
   * Lists prompts provided by the MCP server
   */
  async listPrompts() {
    const res = await this.request(MCP_METHODS.PROMPTS_LIST, {});
    return res?.prompts || [];
  }

  /**
   * Gets a prompt
   * @param {string} name
   * @param {object} [args]
   */
  async getPrompt(name, args = {}) {
    return await this.request(MCP_METHODS.PROMPTS_GET, {
      name,
      arguments: args
    });
  }

  /**
   * Sends ping
   */
  async ping() {
    return await this.request(MCP_METHODS.PING, {});
  }

  /**
   * Returns captured stderr logs
   */
  getStderr() {
    return this.stderrLogs.join('');
  }

  /**
   * Closes client and terminates subprocess
   */
  async close() {
    if (!this.process) return;

    return new Promise((resolve) => {
      const proc = this.process;
      this.process = null;

      const killTimeout = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          // ignore
        }
        resolve();
      }, 1000);

      proc.on('exit', () => {
        clearTimeout(killTimeout);
        resolve();
      });

      try {
        proc.stdin.end();
      } catch {
        // ignore
      }

      try {
        proc.kill('SIGTERM');
      } catch {
        // ignore
      }
    });
  }
}
