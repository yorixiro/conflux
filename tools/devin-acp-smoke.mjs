#!/usr/bin/env node
/**
 * Isolated Devin ACP stdio smoke probe.
 * Run only inside the Ubuntu PRoot where `devin` is installed and authenticated:
 *   node tools/devin-acp-smoke.mjs
 * No repository files are sent as prompts. Does not modify Conflux data.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const child = spawn('devin', ['acp'], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
let nextId = 1;
const pending = new Map();
const timeout = setTimeout(() => fail(new Error('ACP handshake timed out after 20 seconds')), 20_000);
timeout.unref();

function fail(error) {
  console.error(error.message);
  child.kill();
  process.exitCode = 1;
}
function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
const lines = createInterface({ input: child.stdout });
lines.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return fail(new Error('Non-JSON data on ACP stdout')); }
  if (msg.id !== undefined && pending.has(msg.id)) {
    const task = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) task.reject(new Error(JSON.stringify(msg.error)));
    else task.resolve(msg.result);
  }
});
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
child.on('error', fail);
child.on('exit', (code) => {
  for (const task of pending.values()) task.reject(new Error('Devin ACP exited: ' + code));
  pending.clear();
});

try {
  const result = await request('initialize', {
    protocolVersion: 1,
    clientCapabilities: {},
    clientInfo: { name: 'conflux-acp-probe', version: '0.1.0' },
  });
  clearTimeout(timeout);
  console.log('ACP initialize OK:', JSON.stringify({
    protocolVersion: result.protocolVersion,
    agentInfo: result.agentInfo,
    agentCapabilities: result.agentCapabilities,
  }, null, 2));
} catch (error) {
  clearTimeout(timeout);
  console.error('ACP initialize failed:', error.message);
  process.exitCode = 1;
} finally {
  child.kill();
}
