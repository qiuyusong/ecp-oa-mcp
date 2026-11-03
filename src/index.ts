#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { ecpClient } from './clients/ecpClient.js';

async function main() {
  const server = new McpServer({
    name: 'ecp-oa-mcp',
    version: '1.0.0',
  });

  // Register all tools (Personal + Managerial)
  registerTools(server);

  // Register all contextual resources
  registerResources(server);

  // Attempt initial background login if credentials exist
  ecpClient.login().catch((err) => {
    console.error(`[ECP MCP] Background login error: ${err.message}`);
  });

  // Connect via standard I/O transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ECP-OA MCP Server] Running on stdio transport.');
}

main().catch((error) => {
  console.error('[ECP-OA MCP Server] Fatal error:', error);
  process.exit(1);
});
