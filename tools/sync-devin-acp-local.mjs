#!/usr/bin/env node
/**
 * One-shot local ACP delivery from a fetched GitHub branch.
 * No process killing, no tests, no data migration, no git index changes.
 * Run using: git show FETCH_HEAD:tools/sync-devin-acp-local.mjs | node --input-type=module -
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const allowedVersions = [
  '586a5e845e5218e777499a82ac9059bea1fca1d2',
  'd1058043ae1f97b3c4f42d12c8d24577059386c9',
  'f7de2f4272ec016e9b8d2c8af4de3e73e1d1b4c6',
  '5de93c0017080f3c7b066d661d0a14f00a8531a4',
  '92e07bce174be3ea65b07ec0aa18591b10ef5f31',
];
const files = [
  'tools/devin-acp-bridge.mjs',
  'tools/conflux-local-server.ts',
  'src/engines/request/devinAcpReply.ts',
  'src/engines/request/requestPipeline.ts',
  'src/ui/shell/persona/settings/PersonaApiConnectionPanel.tsx',
  'vite.config.ts',
];
const repo = process.cwd();
function git(...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] });
}
function message(text) { process.stdout.write(text + '\n'); }
try {
  if (git('branch', '--show-current').toString().trim() !== 'keke-acp-preview') {
    throw new Error('当前不是 keke-acp-preview，本次没有修改任何文件');
  }
  const head = git('rev-parse', 'FETCH_HEAD').toString().trim();
  const originals = new Map();
  const changes = [];
  for (const file of files) {
    const local = readFileSync(resolve(repo, file));
    const target = git('show', 'FETCH_HEAD:' + file);
    const allowed = allowedVersions.some((version) => {
      try { return local.equals(git('show', version + ':' + file)); }
      catch { return false; }
    });
    if (!local.equals(target) && !allowed) {
      throw new Error('已保护本地自定义修改，未同步：' + file);
    }
    originals.set(file, local);
    if (!local.equals(target)) changes.push(file);
  }
  if (changes.length) {
    try {
      git('restore', '--source=FETCH_HEAD', '--worktree', '--', ...changes);
    } catch (error) {
      for (const [file, old] of originals) writeFileSync(resolve(repo, file), old);
      throw error;
    }
  }
  message('ACP 本地代码已同步到 ' + head.slice(0, 9));
  message('修改文件数：' + changes.length + '；未碰 Git 历史、聊天数据、主题或导航。');
  message('运行中的 4173 / Devin 桥接进程不会热加载后端源文件，需重新加载原来的两个服务。');
  // A single read-only local health probe helps identify the remaining runtime step.
  try {
    const health = await fetch('http://127.0.0.1:4173/devin-acp/health', {
      signal: AbortSignal.timeout(3500)
    });
    const data = await health.json().catch(() => null);
    message('当前 4173 → Devin 桥接：HTTP ' + health.status);
    if (data?.error) message('具体问题：' + data.error);
    if (health.ok) message(data?.running ? '桥接在线；刷新 Conflux 后可进入正式聊天。' : '桥接进程未运行。');
    else if (health.status === 503) message('4173 仍是旧服务或配置无效，需要在原窗口重新启动。');
    else if (health.status === 502) message('桥接进程没有在 127.0.0.1:47831 提供服务。');
  } catch {
    message('当前无法访问 4173，请检查原来的 Conflux 服务窗口。');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
