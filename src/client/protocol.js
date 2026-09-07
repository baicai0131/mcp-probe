/**
 * MCP Protocol Constants and JSON-RPC 2.0 Specifications
 */

export const LATEST_PROTOCOL_VERSION = '2024-11-05';
export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2024-11-05',
  '0.1.0'
];

export const CLIENT_INFO = {
  name: 'mcp-probe',
  version: '0.1.0'
};

export const JSONRPC_VERSION = '2.0';

export const RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_NOT_INITIALIZED: -32002,
  UNKNOWN_ERROR: -32001
};

export const MCP_METHODS = {
  INITIALIZE: 'initialize',
  INITIALIZED_NOTIFICATION: 'notifications/initialized',
  PING: 'ping',
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  RESOURCES_TEMPLATES_LIST: 'resources/templates/list',
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',
  LOGGING_SET_LEVEL: 'logging/setLevel'
};
