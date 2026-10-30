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
const token = process.env.DEVIN_ACP_BRIDGE_TOKEN?.trim() || null;
const command = process.env.DEVIN_ACP_COMMAND ?? 'devin';
const cwd = process.env.DEVIN_ACP_WORKSPACE ?? process.cwd();

if (token && token.length < 24) {
  console.error('If set, DEVIN_ACP_BRIDGE_TOKEN must contain at least 24 characters.');
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
const chatSessions = new Map();
const sessionOptions = new Map();
const legacySessionModels = new Map();
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
  if (message.method === 'session/update' &&
      message.params?.update?.sessionUpdate === 'config_option_update' &&
      Array.isArray(message.params.update.configOptions)) {
    sessionOptions.set(message.params.sessionId, message.params.update.configOptions);
  }
  if (message.method === 'session/update' && active &&
      message.params?.sessionId === active.sessionId) {
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
    sessionOptions.set(sessionId, Array.isArray(result.configOptions) ? result.configOptions : []);
    if (result.models) legacySessionModels.set(sessionId, result.models);
    return sessionId;
  })();
  try { return await ready; }
  catch (error) { ready = null; throw error; }
}

async function acquireChatSession(conversationId) {
  if (!conversationId) return { id: sessionId, isNew: false };
  const existing = chatSessions.get(conversationId);
  if (existing) return { id: existing, isNew: false };
  const result = await request('session/new', { cwd, mcpServers: [] });
  if (typeof result?.sessionId !== 'string') throw new Error('ACP did not return sessionId');
  // Bound the local routing index. An evicted chat starts a fresh ACP session
  // with its full transcript on the next request rather than reusing another chat.
  if (chatSessions.size >= 32) chatSessions.delete(chatSessions.keys().next().value);
  chatSessions.set(conversationId, result.sessionId);
  sessionOptions.set(result.sessionId, Array.isArray(result.configOptions) ? result.configOptions : []);
  if (result.models) legacySessionModels.set(result.sessionId, result.models);
  return { id: result.sessionId, isNew: true };
}


function modelSelector(session) {
  return (sessionOptions.get(session) || []).find((option) =>
    option?.type === 'select' &&
    (option.category === 'model' || (option.id === 'model' && !option.category))
  );
}
function modelValues(config) {
  if (!config || !Array.isArray(config.options)) return [];
  return config.options.flatMap((item) => Array.isArray(item?.options) ? item.options : [item])
    .filter((item) => typeof item?.value === 'string')
    .map((item) => ({ id: item.value, label: typeof item.name === 'string' ? item.name : item.value }));
}
function legacyModelValues(session) {
  const legacy = legacySessionModels.get(session);
  return Array.isArray(legacy?.availableModels)
    ? legacy.availableModels.filter((item) => typeof item?.modelId === 'string')
      .map((item) => ({ id: item.modelId, label: typeof item.name === 'string' ? item.name : item.modelId }))
    : [];
}
function modelSnapshot(session) {
  const config = modelSelector(session);
  const values = modelValues(config);
  const legacy = legacySessionModels.get(session);
  return {
    models: config ? values : legacyModelValues(session),
    selectedModel: config
      ? (typeof config.currentValue === 'string' ? config.currentValue : '')
      : (typeof legacy?.currentModelId === 'string' ? legacy.currentModelId : ''),
    available: Boolean(config || legacy)
  };
}
async function selectModel(session, modelId) {
  if (!modelId) return;
  const config = modelSelector(session);
  const supportedModels = config ? modelValues(config) : legacyModelValues(session);
  if (!supportedModels.some((model) => model.id === modelId)) {
    throw new Error('所选模型不在当前 Devin ACP 可用列表中，请重新拉取');
  }
  if (config) {
    if (config.currentValue === modelId) return;
    const result = await request('session/set_config_option', {
      sessionId: session, configId: config.id ?? config.configId, value: modelId
    });
    if (Array.isArray(result?.configOptions)) sessionOptions.set(session, result.configOptions);
  } else {
    const legacy = legacySessionModels.get(session);
    if (legacy?.currentModelId === modelId) return;
    await request('session/set_model', { sessionId: session, modelId });
    legacySessionModels.set(session, { ...legacy, currentModelId: modelId });
  }
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
  if (origin || req.headers['sec-fetch-site'] === 'cross-site'
    || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) {
    return writeJson(res, 403, { error: 'Local trusted clients only' });
  }
  if (token && req.headers['x-acp-bridge-token'] !== token) {
    return writeJson(res, 401, { error: 'Unauthorized' });
  }
  if (req.method === 'GET' && req.url === '/health') {
    return writeJson(res, 200, { running: !agent.killed && agent.exitCode === null, sessionReady: !!sessionId });
  }
  if (req.method === 'GET' && req.url === '/models') {
    try {
      await initialize();
      return writeJson(res, 200, modelSnapshot(sessionId));
    } catch (error) {
      return writeJson(res, 502, { error: error instanceof Error ? error.message : 'ACP 模型列表拉取失败' });
    }
  }
  if (req.method === 'POST' && req.url === '/cancel') {
    if (promptReserved && active?.sessionId) {
      send({ method: 'session/cancel', params: { sessionId: active.sessionId } });
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
  let activeConversationKey = null;
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 256 * 1024) throw new Error('Prompt is too large');
    }
    const body = JSON.parse(raw);
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) throw new Error('Missing prompt');
    if (body.conversationId != null && (
      typeof body.conversationId !== 'string' || body.conversationId.length > 200
    )) throw new Error('Invalid conversation ID');
    if (body.initialContext != null && (
      typeof body.initialContext !== 'string' || body.initialContext.length > 160000
    )) throw new Error('Invalid conversation context');
    if (body.modelId != null && (
      typeof body.modelId !== 'string' || body.modelId.length > 160
    )) throw new Error('Invalid ACP model ID');
    await initialize();
    activeConversationKey = body.conversationId || null;
    const chat = await acquireChatSession(activeConversationKey);
    if (body.modelId) await selectModel(chat.id, body.modelId);
    const promptText = chat.isNew && body.initialContext?.trim()
      ? body.initialContext
      : body.prompt;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-content-type-options': 'nosniff'
    });
    const write = (event) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    active = { write, sessionId: chat.id };
    const currentPrompt = active;
    res.on('close', () => {
      if (active !== currentPrompt || !chat.id || res.writableEnded) return;
      try { send({ method: 'session/cancel', params: { sessionId: chat.id } }); } catch { /* agent already exited */ }
    });
    const promptId = randomUUID();
    write({ type: 'started', promptId });
    const result = await request('session/prompt', {
      sessionId: chat.id, prompt: [{ type: 'text', text: promptText }]
    }, 10 * 60 * 1000);
    write({ type: 'done', result });
  } catch (error) {
    // After a failed/aborted turn, rebuild the ACP session with the full
    // transcript next time instead of continuing an uncertain conversation.
    if (activeConversationKey) chatSessions.delete(activeConversationKey);
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
