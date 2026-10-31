import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../../types/domain';
import { MessageRow, type MessageRowActions, type MessageRowState } from './MessageRow';

vi.mock('../../../collaborator/PersonaAvatar', () => ({
  PersonaAvatar: ({ role }: { role: string }) => <span data-avatar-role={role} />
}));
vi.mock('./MessageMeta', () => ({
  MessageMeta: () => <div className="message-identity-row">AI 名称</div>
}));
vi.mock('./MessageContent', () => ({
  MessageContent: () => <span className="message-rich-text">消息内容</span>
}));
vi.mock('./MessageActions', () => ({
  MessageActions: () => <div className="message-inline-actions" />
}));
vi.mock('./MessageTokenUsage', () => ({
  MessageTokenUsage: () => null
}));

const state: MessageRowState = {
  editing: null,
  isFocused: false,
  lifecycle: 'rest',
  isThinkingCollapsed: true,
  isCodeExpanded: false,
  canEdit: false,
  canEditAssistant: false,
  canRetry: false,
  canDelete: false,
  codeCardActionMode: 'hidden',
  codeCardProgress: null,
  messageCycleIndex: null
};
const actions = {} as MessageRowActions;

function markup(role: ChatMessage['role'], showChatAvatars: boolean, continuation = false) {
  const message: ChatMessage = {
    id: 'message-1', role, content: '消息内容', timestamp: 1
  };
  return renderToStaticMarkup(
    <MessageRow
      message={message}
      fallbackAssistantName="AI"
      assistantAvatarUrl={null}
      assistantAvatarIconId={null}
      assistantAvatarShape="circle"
      assistantAvatarSize="medium"
      assistantSigilSeed={null}
      showChatAvatars={showChatAvatars}
      showThinking={false}
      state={state}
      actions={actions}
      userAvatarUrl={null}
      userAvatarIconId={null}
      userAvatarShape="circle"
      userAvatarSize="medium"
      codeCardsById={{}}
      isAssistantContinuation={continuation}
    />
  );
}

describe('shared chat avatar/bubble layout', () => {
  it('puts the assistant avatar beside the bubble, below its identity heading', () => {
    const html = markup('assistant', true);
    const identity = html.indexOf('message-identity-row');
    const row = html.indexOf('class="message-turn-bubble-row"');
    const avatar = html.indexOf('message-avatar-slot assistant');
    const bubble = html.indexOf('message-turn-bubble-content');
    expect(identity).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(identity);
    expect(avatar).toBeGreaterThan(row);
    expect(bubble).toBeGreaterThan(avatar);
    expect(html).toContain('--message-avatar-gutter:43px');
  });

  it('keeps a continuation bubble in the same column with an empty avatar slot', () => {
    const html = markup('assistant', true, true);
    expect(html).toContain('message-avatar-slot assistant empty');
    expect(html).toContain('message-turn-bubble-content');
    expect(html).not.toContain('data-avatar-role="assistant"');
  });

  it('keeps avatar-free assistant bubbles and right-side user avatars available', () => {
    const assistant = markup('assistant', false);
    expect(assistant).toContain('message-turn-bubble-content');
    expect(assistant).not.toContain('message-avatar-slot assistant');
    const user = markup('user', true);
    expect(user.indexOf('class="bubble-frame user')).toBeLessThan(user.indexOf('message-avatar-slot user'));
  });
});
