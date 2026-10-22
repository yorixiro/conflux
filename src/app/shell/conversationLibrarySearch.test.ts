import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Conversation } from '../../types/domain';
import { buildConversationCardSummary } from '../collection/conversationCardSummary';
import { searchConversationLibrary } from './conversationLibrarySearch';

function conversation(id: string, messages: ChatMessage[] = []): Conversation {
  return { id, title:id, kind:'direct', collaboratorId:'owner', groupRoomId:null,
    activeProjectId:null, task:null, draft:'', pinnedAt:null, updatedAt:1, messages };
}
const message = (id: string, content: string): ChatMessage => ({ id, content, role:'user', timestamp:1 });

describe('scoped conversation library search', () => {
  it('finds an old persisted message outside the latest excerpt without reading another role’s conversations', async () => {
    const mine = conversation('mine');
    const other = conversation('other-role');
    const readMessages = vi.fn(async () => [message('old', '很久以前约好去看海'), message('new', '晚安')]);
    const result = await searchConversationLibrary({ summaries:[buildConversationCardSummary(mine)],
      conversations:[mine,other], loadedIds:new Set(), query:'看海', readMessages });
    expect(result.results[0]?.searchMatches?.matches[0].messageId).toBe('old');
    expect(readMessages.mock.calls).toEqual([['mine']]);
    expect(mine.messages).toEqual([]);
  });
  it('uses the complete loaded body, including attachment names, without unnecessary persistence reads', async () => {
    const item = conversation('loaded',[{ ...message('file',''), attachments:[{
      id:'a',assetId:'asset',kind:'file',name:'exam-notes.pdf',mimeType:'application/pdf',size:2
    }] }]);
    const readMessages = vi.fn();
    const result = await searchConversationLibrary({ summaries:[buildConversationCardSummary(item)],
      conversations:[item], loadedIds:new Set(['loaded']), query:'exam', readMessages });
    expect(result.results[0]?.searchMatches?.matches[0].messageId).toBe('file');
    expect(readMessages).not.toHaveBeenCalled();
  });
  it('reports unavailable bodies instead of presenting a complete negative result', async () => {
    const item = conversation('broken');
    const result = await searchConversationLibrary({ summaries:[buildConversationCardSummary(item)],
      conversations:[item], loadedIds:new Set(), query:'hello', readMessages:async () => {throw new Error('missing');} });
    expect(result.results).toEqual([]);
    expect(result.failedIds).toEqual(['broken']);
  });
  it('bounds reads and stops queuing further bodies when an obsolete search is cancelled', async () => {
    const items = Array.from({length:12}, (_,i)=>conversation(String(i)));
    const controller = new AbortController();
    let release!: (messages:ChatMessage[])=>void;
    const pending = new Promise<ChatMessage[]>(resolve=>{release=resolve;});
    const readMessages = vi.fn(()=>pending);
    const search = searchConversationLibrary({ summaries:items.map(item=>buildConversationCardSummary(item)),
      conversations:items, loadedIds:new Set(), query:'hello', readMessages, signal:controller.signal });
    expect(readMessages).toHaveBeenCalledTimes(4);
    controller.abort();release([message('m','hello')]);
    const result = await search;
    expect(readMessages).toHaveBeenCalledTimes(4);
    expect(result.results).toEqual([]);
  });
});
