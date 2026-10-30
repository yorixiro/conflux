#!/usr/bin/env node
/**
 * Conflux MCP stdio adapter for Devin ACP.
 * Tools are dynamic: they originate in the browser-scoped Conflux registry.
 * This process has no LocalData/filesystem execution capability.
 */
import { createInterface } from 'node:readline';

const port = Number(process.env.DEVIN_ACP_BRIDGE_PORT || 47831);
const token = process.env.DEVIN_ACP_BRIDGE_TOKEN || '';
const base = 'http://127.0.0.1:' + port;
let initialized = false;
let revision = -1;
let polling = false;

async function bridge(path, options = {}) {
  if (token.length < 24 || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('Local ACP tool bridge is not configured');
  }
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'x-acp-bridge-token': token,
      ...(options.body ? { 'content-type': 'application/json' } : {})
    },
    signal: AbortSignal.timeout(65000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Tool bridge rejected request');
  return result;
}
function send(value) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...value }) + '\n');
}
async function refresh() {
  if (polling || !initialized) return;
  polling = true;
  try {
    const response = await bridge('/tools');
    if (revision !== -1 && revision !== response.revision) {
      send({ method: 'notifications/tools/list_changed' });
    }
    revision = response.revision;
  } catch { /* Bridge is not yet connected; never invent a tool list. */ }
  finally { polling = false; }
}
async function handle(message) {
  if (!message || typeof message !== 'object' || message.id === undefined) return;
  const { id, method } = message;
  try {
    if (method === 'initialize') {
      initialized = true;
      send({ id, result: {
        protocolVersion: message.params?.protocolVersion || '2024-11-05',
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: 'conflux', version: '1.0.0' }
      } });
    } else if (method === 'ping') {
      send({ id, result: {} });
    } else if (method === 'tools/list') {
      const result = await bridge('/tools');
      revision = result.revision;
      send({ id, result: { tools: result.tools } });
    } else if (method === 'tools/call') {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      if (typeof name !== 'string' || !args || typeof args !== 'object' || Array.isArray(args)) {
        throw new Error('Invalid tool invocation');
      }
      const result = await bridge('/tool/request', {
        method: 'POST', body: JSON.stringify({ name, arguments: args })
      });
      send({ id, result: {
        isError: result.isError === true,
        content: [{ type: 'text', text: String(result.text || '') }]
      } });
    } else {
      send({ id, error: { code: -32601, message: 'MCP method not supported' } });
    }
  } catch (error) {
    if (method === 'tools/call') {
      send({ id, result: { isError: true, content: [{
        type: 'text', text: error instanceof Error ? error.message : 'Tool call failed'
      }] } });
    } else {
      send({ id, error: { code: -32000, message: error instanceof Error ? error.message : 'MCP error' } });
    }
  }
}
createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  void handle(message);
});
const interval = setInterval(() => { void refresh(); }, 1000);
interval.unref();
