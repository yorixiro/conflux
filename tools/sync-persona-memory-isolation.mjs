#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const join = (...lines) => lines.join('\n');
// Only fix persona-memory isolation; keep the product's existing system identity and caching rules unchanged.
const edits = {
  'src/engines/request/requestPreparation.ts': [
    ['const { api, persona, personas, messages, toolLedger, toolContext, currentTask, nickname } = params;',
     'const { api, persona, messages, toolLedger, toolContext, currentTask, nickname } = params;'],
    [join(
      '  const memoryPlan = resolveRequestMemoryPlan({',
      '    memory: persona?.memory,',
      '    inheritedMemorySources: persona',
      '      ? (personas ?? [])',
      '          .filter((candidate) => candidate.id !== persona.id)',
      '          .map((candidate) => ({ id: candidate.id, memory: candidate.memory }))',
      '      : [],',
      '    maxTokens: budgetPlan.buckets.memory.maxTokens',
      '  });'),
     join(
      '  // Private role memory only. Sharing across personas must never happen',
      '  // implicitly just because their settings contain a legacy global flag.',
      '  const memoryPlan = resolveRequestMemoryPlan({',
      '    memory: persona?.memory,',
      '    maxTokens: budgetPlan.buckets.memory.maxTokens',
      '  });')]
  ],
  'src/engines/request/requestContextContent.ts': [
    ['以下是当前协作者可调用的长期记忆线索。', '以下仅是当前角色自己的长期记忆线索。'],
    ['这些是当前协作者可按需读取的长期资料。', '这些是当前角色可按需读取的长期资料。']
  ],
  'src/app/chat/chatMemoryToolActions.ts': [
    [join(
      '    const targetCollaborator = resolveTargetCollaborator(conversationId);',
      '    const opened = openConversationMemorySource({',
      '      conversations: store.chat.conversations.filter((candidate) =>',
      '        !targetCollaborator || candidate.collaboratorId === targetCollaborator.id',
      '      ),'),
     join(
      '    const targetCollaborator = resolveTargetCollaborator(conversationId);',
      "    if (!targetCollaborator) return { ok: false as const, error: '当前没有可读取记忆的角色。' };",
      '    const opened = openConversationMemorySource({',
      '      conversations: store.chat.conversations.filter((candidate) =>',
      '        candidate.collaboratorId === targetCollaborator.id',
      '      ),')]
  ]
};

try {
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  if (branch !== 'keke-acp-preview') throw new Error('当前分支不同，未修改任何文件');
  const planned = [];
  for (const [file, replacements] of Object.entries(edits)) {
    const before = readFileSync(file, 'utf8');
    let after = before;
    for (const [oldText, newText] of replacements) {
      const occurrences = after.split(oldText).length - 1;
      if (occurrences === 1) after = after.replace(oldText, newText);
      else if (newText ? after.includes(newText) : !after.includes(oldText)) continue;
      else throw new Error('本地文件有不同修改，安全停止：' + file);
    }
    planned.push({ file, before, after });
  }
  const written = [];
  try {
    for (const change of planned) {
      if (change.before === change.after) continue;
      writeFileSync(change.file, change.after);
      written.push(change);
    }
  } catch (error) {
    for (const change of written.reverse()) writeFileSync(change.file, change.before);
    throw error;
  }
  console.log('记忆隔离已同步，修改文件 ' + written.length + ' 个；未修改全局身份、角色设定或缓存。');
  console.log('无需重启 4173；未修改本地数据、API 页面或 Devin 桥接。');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
