import { describe, expect, it, vi } from 'vitest';
import type { ChatActionStoreBindings, ChatDerivedStatePort, ChatUiActionState } from './chatPorts';
import { createChatActionHandlers } from './chatActions';
import type { ChatMessage, Conversation } from '../../types/domain';

function message(id: string, role: ChatMessage['role'], content: string, timestamp: number): ChatMessage {
  return { id, role, content, timestamp };
}

const pharosPersona = { id: 'pharos', name: 'Pharos' } as never;

function createHandlersForConversation(params: {
  conversation: Conversation;
  ui?: Partial<ChatUiActionState>;
  chat?: Partial<ChatActionStoreBindings['chat']>;
  space?: Partial<ChatActionStoreBindings['space']>;
  derived?: Partial<ChatDerivedStatePort>;
}) {
  const ui: ChatUiActionState = {
    sending: false,
    editing: null,
    confirm: vi.fn(() => true),
    setCommandStatus: vi.fn(),
    triggerSubmitFlight: vi.fn(),
    cancelEditingMessage: vi.fn(),
    ...params.ui
  };
  const chat: ChatActionStoreBindings['chat'] = {
    conversations: [params.conversation],
    activeConversationId: params.conversation.id,
    inputDraft: '',
    pendingWorkspaceProposals: [],
    createConversation: vi.fn(() => 'conv-branch'),
    ensureConversationWritable: vi.fn(async (conversationId: string) => ({
      conversationId,
      conversation: conversationId === params.conversation.id
        ? params.conversation
        : { ...params.conversation, id: conversationId, messages: [] },
      messages: conversationId === params.conversation.id ? params.conversation.messages : []
    })),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    orphanConversation: vi.fn(),
    deleteConversation: vi.fn(),
    setInputDraft: vi.fn(),
    replaceConversationMessages: vi.fn(),
    setConversationActiveProject: vi.fn(),
    upsertPendingWorkspaceProposal: vi.fn(),
    removePendingWorkspaceProposal: vi.fn(),
    appendRuntimeFeedbackEvent: vi.fn(),
    getRuntimeFeedbackEvents: vi.fn(() => []),
    setActiveConversation: vi.fn(),
    readLatestState: () => ({
      inputDraft: '',
      conversations: [params.conversation],
      activeConversationId: params.conversation.id
    }),
    ...params.chat
  };
  const space: ChatActionStoreBindings['space'] = {
    frontstageCollaboratorId: 'pharos',
    editingCollaboratorId: null,
    pendingCardReference: null,
    pendingAttachments: [],
    setFrontstageCollaboratorId: vi.fn(),
    setEditingCollaboratorId: vi.fn(),
    setPendingCardReference: vi.fn(),
    clearPendingCardReference: vi.fn(),
    clearPendingAttachments: vi.fn(),
    readLatestState: () => ({
      frontstageCollaboratorId: 'pharos',
      pendingCardReference: null,
      pendingAttachments: []
    }),
    rollbackPreviewForConversationDeletion: vi.fn(() => false),
    ...params.space
  };

  const runReply = vi.fn(() => Promise.resolve());
  return {
    runReply,
    chat,
    space,
    ui,
    handlers: createChatActionHandlers({
      startupReady: true,
      ui,
      store: {
        chat,
        persona: {
          activeCollaboratorId: 'pharos',
          personas: [pharosPersona],
          setActiveCollaborator: vi.fn(),
          deleteCollaborator: vi.fn(() => true),
          readLatestState: () => ({
            activeCollaboratorId: 'pharos',
            personas: [pharosPersona]
          })
        },
        space,
        runtime: {
          companionConnections: [],
          deleteCompanionConnection: vi.fn()
        }
      },
      derived: {
        activeConversation: params.conversation,
        activeCollaboratorSourceId: 'pharos',
        persona: null,
        hasUnsupportedPendingImages: false,
        codeCardActionModeByMessageId: {},
        ...params.derived
      },
      runReply,
      submitToolCommand: vi.fn(() => Promise.resolve(false)),
      activeSubmitFingerprintRef: { current: null }
    })
  };
}

describe('message actions', () => {
  it('edits an assistant message in place', async () => {
    const assistantMessage = message('assistant-1', 'assistant', '旧回答', 1000);
    const conversation: Conversation = {
      id: 'conv-edit',
      title: '可编辑对话',
      collaboratorId: 'pharos',
      activeProjectId: null,
      messages: [assistantMessage],
      pinnedAt: null,
      updatedAt: 1000
    };
    const { chat, handlers, ui } = createHandlersForConversation({ conversation });

    await handlers.updateAssistantMessage(assistantMessage, '  新回答  ');

    expect(chat.updateMessage).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv-edit'
    }), 'assistant-1', expect.objectContaining({
      content: '新回答',
      timestamp: expect.any(Number)
    }));
    expect(ui.setCommandStatus).toHaveBeenCalledWith('已修改这条回答。');
  });

  it('forks a conversation from the selected message', async () => {
    const userMessage = message('user-1', 'user', '问题', 1000);
    const assistantMessage = message('assistant-1', 'assistant', '回答', 1001);
    const laterMessage = message('user-2', 'user', '后续', 1002);
    const conversation: Conversation = {
      id: 'conv-source',
      title: '源对话',
      collaboratorId: 'pharos',
      activeProjectId: 'workspace-1',
      messages: [userMessage, assistantMessage, laterMessage],
      pinnedAt: null,
      updatedAt: 1002
    };
    const { chat, handlers, space } = createHandlersForConversation({ conversation });

    await handlers.forkConversationFromMessage(assistantMessage);

    expect(chat.createConversation).toHaveBeenCalledWith('pharos', { activeProjectId: 'workspace-1' });
    expect(chat.replaceConversationMessages).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv-branch'
    }), [
      expect.objectContaining({ role: 'user', content: '问题' }),
      expect.objectContaining({ role: 'assistant', content: '回答' })
    ]);
    expect(vi.mocked(chat.replaceConversationMessages).mock.calls[0][1][0].id).not.toBe('user-1');
    expect(vi.mocked(chat.replaceConversationMessages).mock.calls[0][1][1].id).not.toBe('assistant-1');
    expect(space.clearPendingAttachments).toHaveBeenCalled();
    expect(space.clearPendingCardReference).toHaveBeenCalled();
    expect(chat.setActiveConversation).toHaveBeenCalledWith('conv-branch');
  });
});


describe('message deletion and resend confirmation', () => {
  const messages = [message('u1', 'user', '问题', 1), message('a1', 'assistant', '回答', 2), message('u2', 'user', '后续', 3)];
  const conversation: Conversation = {
    id: 'conv-delete', title: '删除检查', collaboratorId: 'pharos', messages,
    pinnedAt: null, updatedAt: 3
  };

  it.each(['user', 'assistant'] as const)('deletes only the selected %s message without requesting a reply', async (role) => {
    const target = messages.find(entry => entry.role === role)!;
    const { handlers, chat, ui, runReply } = createHandlersForConversation({ conversation });
    await handlers.deleteMessage(target);
    expect(ui.confirm).toHaveBeenCalledOnce();
    expect(chat.replaceConversationMessages).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: conversation.id }), messages.filter(entry => entry.id !== target.id)
    );
    expect(runReply).not.toHaveBeenCalled();
  });

  it('removes associated tool receipts but preserves other messages', async () => {
    const receipt = { ...message('tool1', 'system', '工具回执', 2), origin: 'tool-runtime',
      toolInvocation: { kind: 'runCode', originMessageId: 'a1' } } as ChatMessage;
    const otherReceipt = { ...receipt, id: 'tool2', toolInvocation: { ...receipt.toolInvocation!, originMessageId: 'other' } };
    const source = { ...conversation, messages: [...messages, receipt, otherReceipt] };
    const { handlers, chat, ui } = createHandlersForConversation({ conversation: source });
    await handlers.deleteMessage(messages[1]);
    expect(ui.confirm).toHaveBeenCalledWith(expect.stringContaining('关联的工具回执'));
    expect(chat.replaceConversationMessages).toHaveBeenCalledWith(
      expect.anything(), [messages[0], messages[2], otherReceipt]
    );
  });

  it('keeps history unchanged when deletion is cancelled or the body cannot be loaded', async () => {
    const cancelled = createHandlersForConversation({ conversation, ui: { confirm: vi.fn(() => false) } });
    await cancelled.handlers.deleteMessage(messages[1]);
    expect(cancelled.chat.replaceConversationMessages).not.toHaveBeenCalled();
    const unavailable = createHandlersForConversation({ conversation, chat: { ensureConversationWritable: vi.fn(async () => null) } });
    await unavailable.handlers.deleteMessage(messages[1]);
    expect(unavailable.ui.confirm).not.toHaveBeenCalled();
    expect(unavailable.chat.replaceConversationMessages).not.toHaveBeenCalled();
    expect(unavailable.runReply).not.toHaveBeenCalled();
  });

  it('does not rewrite history or request a model when resend confirmation is cancelled', async () => {
    const { handlers, chat, ui, runReply } = createHandlersForConversation({ conversation, ui: {
      confirm: vi.fn(() => false), editing: { messageId: 'u1', draft: '新问题', attachments: [] }
    } });
    await handlers.retryLatestAssistant(messages[1]);
    await handlers.commitMessageEdit(messages[0]);
    expect(ui.confirm).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ui.confirm).mock.calls.every(([text]) => text.includes('按接口计费'))).toBe(true);
    expect(chat.replaceConversationMessages).not.toHaveBeenCalled();
    expect(ui.cancelEditingMessage).not.toHaveBeenCalled();
    expect(runReply).not.toHaveBeenCalled();
  });
});
