import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fakeAgent = String.raw`#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const sessions = new Map();
let counter = 0;
const send = (value) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...value }) + '\n');

async function callTools(server) {
  const child = spawn(server.command, server.args, {
    cwd: process.cwd(), env: process.env, stdio: ['pipe', 'pipe', 'pipe']
  });
  let nextId = 0;
  const tasks = new Map();
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const task = tasks.get(message.id);
    if (!task) return;
    tasks.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    tasks.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  try {
    await request('initialize', {
      protocolVersion: '2024-11-05', capabilities: {},
      clientInfo: { name: 'mock-devin', version: '0.1' }
    });
    const catalog = await request('tools/list', {});
    const names = catalog.tools.map((tool) => tool.name);
    if (!names.includes('searchMemory') || !names.includes('listEnvironmentNodes')) {
      throw new Error('Native MCP tool schemas were not registered');
    }
    const first = await request('tools/call', {
      name: 'searchMemory', arguments: { query: '星河', mode: 'auto' }
    });
    const second = await request('tools/call', {
      name: 'listEnvironmentNodes', arguments: {}
    });
    if (first.isError || second.isError) {
      throw new Error('MCP tool returned execution error');
    }
    return first.content[0].text + ' / ' + second.content[0].text;
  } finally {
    child.kill();
    lines.close();
  }
}
createInterface({ input: process.stdin }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  void (async () => {
    if (message.method === 'initialize') {
      send({ id: message.id, result: {
        protocolVersion: 1, agentInfo: { name: 'mock-devin' },
        agentCapabilities: {}
      } });
      return;
    }
    if (message.method === 'session/new') {
      const sessionId = 'mock-session-' + ++counter;
      sessions.set(sessionId, message.params?.mcpServers || []);
      send({ id: message.id, result: { sessionId, configOptions: [] } });
      return;
    }
    if (message.method === 'session/prompt') {
      try {
        const servers = sessions.get(message.params.sessionId) || [];
        if (!servers.length) throw new Error('ACP session/new omitted mcpServers');
        const evidence = await callTools(servers[0]);
        send({ method: 'session/update', params: {
          sessionId: message.params.sessionId,
          update: { sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: '完成检索：' + evidence } }
        } });
        send({ id: message.id, result: { stopReason: 'end_turn' } });
      } catch (error) {
        send({ id: message.id, error: { code: -32000, message: error.message } });
      }
      return;
    }
    if (message.method === 'session/cancel') return;
    send({ id: message.id, error: { code: -32601, message: 'Unsupported method' } });
  })();
});
`;

const token = 'test-only-token-0123456789abcdefghijk';
async function reservePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function waitForServer(base) {
  for (let index = 0; index < 100; index++) {
    try {
      const response = await fetch(base + '/health', { headers: { 'x-acp-bridge-token': token } });
      if (response.ok) return;
    } catch { /* Server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Mock ACP bridge did not start');
}
function tool(name, properties = {}, required = []) {
  return {
    type: 'function', function: {
      name, description: 'Mock ' + name,
      parameters: { type: 'object', properties, required, additionalProperties: false }
    }
  };
}

test('mock ACP native searchMemory and listEnvironmentNodes complete a browser-executed round trip', {
  timeout: 15000
}, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'conflux-acp-native-test-'));
  const agentFile = join(dir, 'fake-devin.mjs');
  const port = await reservePort();
  const base = 'http://127.0.0.1:' + port;
  await writeFile(agentFile, fakeAgent);
  await chmod(agentFile, 0o755);
  const bridge = spawn(process.execPath, [
    fileURLToPath(new URL('./devin-acp-bridge.mjs', import.meta.url))
  ], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {
      ...process.env,
      DEVIN_ACP_COMMAND: agentFile,
      DEVIN_ACP_BRIDGE_PORT: String(port),
      DEVIN_ACP_BRIDGE_TOKEN: token
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  bridge.stderr.on('data', (chunk) => { logs += String(chunk); });
  const headers = { 'content-type': 'application/json', 'x-acp-bridge-token': token };
  try {
    await waitForServer(base);
    const response = await fetch(base + '/prompt', {
      method: 'POST', headers,
      body: JSON.stringify({
        conversationId: 'mock-memory-conversation',
        prompt: '请调用 searchMemory 和 listEnvironmentNodes',
        tools: [
          tool('searchMemory', { query: { type: 'string' } }, ['query']),
          tool('listEnvironmentNodes')
        ]
      })
    });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    const calls = [];
    const events = [];
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      let boundary;
      while ((boundary = pending.indexOf('\n\n')) >= 0) {
        const frame = pending.slice(0, boundary);
        pending = pending.slice(boundary + 2);
        const line = frame.split('\n').find((part) => part.startsWith('data: '));
        if (!line) continue;
        const event = JSON.parse(line.slice(6));
        events.push(event);
        if (event.type === 'tool_request') {
          calls.push(event.name);
          // A disabled tool is rejected even while a valid conversation is active.
          const denied = await fetch(base + '/tool/request', {
            method: 'POST', headers,
            body: JSON.stringify({ name: 'writeMemory', arguments: { memory: ['unapproved'] } })
          });
          assert.equal(denied.status, 403);
          const text = event.name === 'searchMemory'
            ? '记忆候选：星河是项目中的记忆展示功能'
            : '环境节点：记忆、收藏册';
          const receipt = await fetch(base + '/tool/result', {
            method: 'POST', headers,
            body: JSON.stringify({ callId: event.callId, isError: false, text })
          });
          assert.equal(receipt.status, 200);
        }
      }
      if (done) break;
    }
    assert.deepEqual(calls, ['searchMemory', 'listEnvironmentNodes']);
    assert.ok(events.some((e) =>
      e.type === 'update' && e.update?.content?.text?.includes('记忆候选')));
    assert.ok(events.some((e) =>
      e.type === 'update' && e.update?.content?.text?.includes('环境节点')));
    assert.ok(events.some((e) => e.type === 'done'));
    assert.ok(!events.some((e) => e.type === 'error'));
    const idleCatalog = await fetch(base + '/tools', {
      headers: { 'x-acp-bridge-token': token }
    });
    assert.deepEqual((await idleCatalog.json()).tools, []);
    const late = await fetch(base + '/tool/result', {
      method: 'POST', headers,
      body: JSON.stringify({
        callId: events.find((e) => e.type === 'tool_request').callId,
        isError: false, text: 'late result'
      })
    });
    assert.equal(late.status, 409);
    const idleInvocation = await fetch(base + '/tool/request', {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'searchMemory', arguments: { query: 'outside session' } })
    });
    assert.equal(idleInvocation.status, 409);
  } finally {
    bridge.kill('SIGTERM');
    if (bridge.exitCode === null && bridge.signalCode === null) {
      await new Promise((resolve) => bridge.once('exit', resolve));
    }
    await rm(dir, { recursive: true, force: true });
  }
  assert.equal(logs, '');
});
