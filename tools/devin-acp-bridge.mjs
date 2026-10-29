#!/usr/bin/env node
/**
 * Local Devin ACP -> HTTP event bridge for Conflux development.
 *
 * Runs inside the same Ubuntu/PRoot environment as Devin. Never exposes the
 * Devin process or authentication to the public network. No API-key facade:
 * this is a stateful ACP client that speaks JSON-RPC over stdio.
 *
 * DEVIN_ACP_BRIDGE_TOKEN must be set to a long random secret. Consumers pass it
 * in X-ACP-Bridge-Token. In production, keep it in an OS-protected local config,
 * not in a web bundle or exported chat data.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const host = '127.0.0.1';
const port = Number(process.env.DEVIN_ACP_BRIDGE_PORT ?? 47831);
const token = process.env.DEVIN_ACP_BRIDGE_TOKEN;
const command = process.env.DEVIN_ACP_COMMAND ?? 'devin';
const cwd = process.env.DEVIN_ACP_WORKSPACE ?? process.cwd();

if (!token || token.length < 24) {
  console.error('Set DEVIN_ACP_BRIDGE_TOKEN (at least 24 characters) before starting.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Invalid DEVIN_ACP_BRIDGE_PORT');
  process.exit(1);
}

const agent = spawn(command, ['acp'], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
let sequence = 0;
let buffer = '';
let sessionId = null;
let active = null;
const pending = new Map();

let promptReserved = false;

function failAll(reason) {
  for (const [, entry] of pending) entry.reject(new Error(reason));
  pending.clear();
  if (active) active.write({ type: 'error', error: reason });
  active = null;
}
function send(message) {
  if (!agent.stdin.writable) throw new Error('Devin ACP process is unavailable');
  agent.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
}
function request(method, params, timeoutMs = 20000) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`ACP ${method} timed out`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); }
    });
    try { send({ id, method, params }); }
    catch (error) { pending.delete(id); clearTimeout(timer); reject(error); }
  });
}
function onMessage(message) {
  if (typeof message.id !== 'undefined' && (message.result !== undefined || message.error !== undefined)) {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message || 'ACP error'));
    else entry.resolve(message.result);
    return;
  }
  // Never silently approve shell/file operations. The UI needs an explicit
  // permission surface before this bridge can support those requests.
  if (typeof message.id !== 'undefined' && message.method) {
    send({ id: message.id, error: { code: -32601, message: 'Permission or client method unsupported by this bridge' } });
    return;
  }
  if (message.method === 'session/update' && active &&
      message.params?.sessionId === sessionId) {
    active.write({ type: 'update', update: message.params.update });
  }
}
agent.stdout.setEncoding('utf8');
agent.stdout.on('data', (chunk) => {
  buffer += chunk;
  if (buffer.length > 4 * 1024 * 1024) {
    failAll('ACP response exceeded buffer limit');
    agent.kill();
    return;
  }
  let index;
  while ((index = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    try { onMessage(JSON.parse(line)); }
    catch { /* Malformed ACP output is never forwarded as trusted data. */ }
  }
});
agent.stderr.on('data', () => {}); // Do not expose potentially sensitive CLI logs.
agent.on('error', (error) => failAll(error.message));
agent.on('exit', (code) => failAll(`Devin ACP exited (${code})`));

let ready;
async function initialize() {
  if (ready) return ready;
  ready = (async () => {
    // Devin CLI's ACP v1 transport. Do not assume v2 wire compatibility.
    await request('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'conflux-devin-acp', version: '0.1.0' },
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }
    });
    const result = await request('session/new', { cwd, mcpServers: [] });
    if (typeof result?.sessionId !== 'string') throw new Error('ACP did not return sessionId');
    sessionId = result.sessionId;
    return sessionId;
  })();
  try { return await ready; }
  catch (error) { ready = null; throw error; }
}

function writeJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}
const server = createServer(async (req, res) => {
  // No CORS wildcard: a browser page must not silently access local ACP.
  const origin = req.headers.origin;
  if (origin) return writeJson(res, 403, { error: 'Use a trusted same-origin backend adapter' });
  if (req.headers['x-acp-bridge-token'] !== token) {
    return writeJson(res, 401, { error: 'Unauthorized' });
  }
  if (req.method === 'GET' && req.url === '/health') {
    return writeJson(res, 200, { running: !agent.killed && agent.exitCode === null, sessionReady: !!sessionId });
  }
  if (req.method === 'POST' && req.url === '/cancel') {
    if (promptReserved && sessionId) {
      send({ method: 'session/cancel', params: { sessionId } });
      return writeJson(res, 200, { cancelled: true });
    }
    return writeJson(res, 409, { error: 'No active prompt' });
  }
  if (req.method !== 'POST' || req.url !== '/prompt') {
    return writeJson(res, 404, { error: 'Not found' });
  }
  if (promptReserved) return writeJson(res, 409, { error: 'Another ACP prompt is active' });
  promptReserved = true;
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 256 * 1024) throw new Error('Prompt is too large');
    }
    const body = JSON.parse(raw);
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) throw new Error('Missing prompt');
    await initialize();
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-content-type-options': 'nosniff'
    });
    const write = (event) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    active = { write };
    const currentPrompt = active;
    res.on('close', () => {
      if (active !== currentPrompt || !sessionId || res.writableEnded) return;
      try { send({ method: 'session/cancel', params: { sessionId } }); } catch { /* agent already exited */ }
    });
    const promptId = randomUUID();
    write({ type: 'started', promptId });
    const result = await request('session/prompt', {
      sessionId, prompt: [{ type: 'text', text: body.prompt }]
    }, 10 * 60 * 1000);
    write({ type: 'done', result });
  } catch (error) {
    if (res.headersSent) active?.write({ type: 'error', error: error.message });
    else writeJson(res, 400, { error: error.message });
  } finally {
    active = null;
    promptReserved = false;
    if (!res.writableEnded) res.end();
  }
});
server.listen(port, host, () => console.log(`Devin ACP bridge listening on ${host}:${port}`));
process.on('SIGTERM', () => { agent.kill(); server.close(); });
process.on('SIGINT', () => { agent.kill(); server.close(); });
