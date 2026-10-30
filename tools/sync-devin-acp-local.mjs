#!/usr/bin/env node
/**
 * Safely sync only the ACP integration from FETCH_HEAD into the local Termux
 * working tree. Preserve custom uncommitted changes by a conflict-free
 * three-way merge against the user's own HEAD version. This script does not
 * touch git history/index, run tests, restart services, or access chat data.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const knownRemoteVersions = [
  '586a5e845e5218e777499a82ac9059bea1fca1d2',
  'd1058043ae1f97b3c4f42d12c8d24577059386c9',
  'f7de2f4272ec016e9b8d2c8af4de3e73e1d1b4c6',
  '5de93c0017080f3c7b066d661d0a14f00a8531a4',
  '92e07bce174be3ea65b07ec0aa18591b10ef5f31',
  '96f9d0e0a306f7184fbf3903257d404999efbe03',
  'bf5972949f849eebe9d29cbff3757587bb1a47a0',
];
const paths = [
  'tools/devin-acp-bridge.mjs',
  'tools/conflux-local-server.ts',
  'src/engines/request/devinAcpReply.ts',
  'src/engines/request/requestPipeline.ts',
  'src/ui/shell/persona/settings/PersonaApiConnectionPanel.tsx',
  'src/ui/shell/DevinAcpConnectionPanel.tsx',
  'src/ui/shell/ApiProviderConfigForm.tsx',
  'src/ui/shell/ApiProviderAddView.tsx',
  'src/ui/app-shell/AppShellView.tsx',
  'src/ui/app-shell/ConfluxSidebarDialog.tsx',
  'src/ui/worlds/chat/message/MessageTokenUsage.tsx',
  'src/types/domain/chat.ts',
  'src/engines/provider-runtime/providerRuntimeTypes.ts',
  'src/engines/chatMessageNormalization.ts',
  'vite.config.ts',
];
const repo = process.cwd();
function git(...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024
  });
}
const say = (line) => console.log(line);
let dir;
try {
  if (git('branch', '--show-current').toString().trim() !== 'keke-acp-preview') {
    throw new Error('不是 keke-acp-preview 分支，未修改任何文件');
  }
  const remote = git('rev-parse', 'FETCH_HEAD').toString().trim();
  // Prepare ALL changes before writing any working-tree file.
  dir = mkdtempSync(join(tmpdir(), 'conflux-acp-sync-'));
  const planned = [];
  const conflicts = [];
  for (let n = 0; n < paths.length; n++) {
    const path = paths[n];
    const local = readFileSync(resolve(repo, path));
    const target = git('show', 'FETCH_HEAD:' + path);
    if (local.equals(target)) continue;
    const head = git('show', 'HEAD:' + path);
    let candidate = target;
    const previouslySynced = knownRemoteVersions.some((sha) => {
      try { return local.equals(git('show', sha + ':' + path)); }
      catch { return false; }
    });
    if (!local.equals(head) && !previouslySynced) {
      const a = join(dir, n + '-local');
      const b = join(dir, n + '-base');
      const c = join(dir, n + '-remote');
      writeFileSync(a, local);
      writeFileSync(b, head);
      writeFileSync(c, target);
      try {
        // -p only prints the merge; never changes the three input files.
        candidate = git('merge-file', '-p', a, b, c);
      } catch {
        conflicts.push(path);
        continue; // Never overwrite a file with conflicting user edits.
      }
    }
    if (!local.equals(candidate)) planned.push({ path, before: local, after: candidate });
  }
  const written = [];
  try {
    for (const item of planned) {
      writeFileSync(resolve(repo, item.path), item.after);
      written.push(item);
    }
  } catch (error) {
    for (const item of written.reverse()) writeFileSync(resolve(repo, item.path), item.before);
    throw error;
  }
  say('ACP 与会话显示修复同步完成：' + remote.slice(0, 9));
  say('更新文件：' + planned.length + '；不修改主题、导航、数据、Git 提交或索引。');
  if (conflicts.length) {
    say('以下文件保留本地修改，未覆盖：');
    for (const path of conflicts) say('  - ' + path);
    say('注意：这些文件的远端功能尚未同步，不能宣称全部交付。');
  } else {
    say('所有目标文件均已安全同步或无须更新。');
  }
  if (planned.some(({ path }) => path === 'tools/devin-acp-bridge.mjs' || path === 'tools/conflux-local-server.ts' || path === 'vite.config.ts')) {
    say('后端文件已更新；若运行中服务还是旧版本，才需要分别重新加载对应进程。');
  } else {
    say('本次仅前端/请求模块更新：刷新 Conflux 即可，无需重启 4173 或 Devin 桥接。');
  }
  try {
    const response = await fetch('http://127.0.0.1:4173/devin-acp/health', {
      signal: AbortSignal.timeout(2500)
    });
    const data = await response.json().catch(() => null);
    say('当前 4173 的 ACP 状态：HTTP ' + response.status);
    if (typeof data?.error === 'string') say('原因：' + data.error);
    if (response.ok) say(data?.running ? '桥接进程在线。' : '桥接进程没有运行。');
  } catch {
    say('4173 当前不可达；没有更改或重启该服务。');
  }
} catch (error) {
  console.error('安全同步停止：' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  if (dir) rmSync(dir, { recursive: true, force: true });
}
