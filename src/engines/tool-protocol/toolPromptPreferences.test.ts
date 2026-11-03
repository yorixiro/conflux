import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POLARIS_TOOL_PROMPT_PREFERENCES,
  POLARIS_TOOL_PROMPT_GROUP_DESCRIPTIONS,
  POLARIS_TOOL_PROMPT_GROUP_ORDER,
  POLARIS_TOOLBOX_PROMPT_GROUP_ORDER
} from './toolPromptPreferences';

describe('toolPromptPreferences', () => {
  it('allows contextual image sharing and low-risk memory capture by default without opening scheduled outreach', () => {
    expect(DEFAULT_POLARIS_TOOL_PROMPT_PREFERENCES.attachment).toBe(true);
    expect(DEFAULT_POLARIS_TOOL_PROMPT_PREFERENCES.memoryWrite).toBe(true);
    expect(DEFAULT_POLARIS_TOOL_PROMPT_PREFERENCES.proactive).toBe(false);
  });

  it('keeps workspace out of the user-facing toolbox toggles', () => {
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).not.toContain('project');
  });

  it('keeps task in the user-facing toolbox toggles', () => {
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('task');
  });

  it('keeps MCP in the user-facing toolbox toggles', () => {
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('mcp');
  });

  it('keeps product knowledge in the user-facing toolbox toggles', () => {
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('knowledge');
  });

  it('keeps active recall separate from long reference docs', () => {
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('memory');
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('memoryRecall');
    expect(POLARIS_TOOL_PROMPT_GROUP_DESCRIPTIONS.memory).toContain('长期资料全文');
    expect(POLARIS_TOOL_PROMPT_GROUP_DESCRIPTIONS.memoryRecall).toContain('过往对话');
  });

  it('puts the environment directory first in tool prompts and the toolbox', () => {
    expect(POLARIS_TOOL_PROMPT_GROUP_ORDER[0]).toBe('environment');
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER[0]).toBe('environment');
    expect(POLARIS_TOOL_PROMPT_GROUP_DESCRIPTIONS.environment).toContain('当前环境目录');
    expect(POLARIS_TOOLBOX_PROMPT_GROUP_ORDER).toContain('knowledge');
    expect(POLARIS_TOOL_PROMPT_GROUP_DESCRIPTIONS.knowledge).toContain('不知道怎么使用北极星');
  });
});
