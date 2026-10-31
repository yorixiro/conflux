import { describe, expect, it } from 'vitest';
import { parseAnthropicUsage, parseOpenAiCompatibleUsage } from './providerRuntimeUsage';

describe('parseAnthropicUsage', () => {
  it('counts cache reads and writes in total input without double counting', () => {
    expect(parseAnthropicUsage({
      input_tokens: 120,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: 300,
      output_tokens: 40
    })).toEqual({
      totalTokens: 5460,
      inputTokens: 5420,
      outputTokens: 40,
      cachedInputTokens: 5000,
      cacheMissInputTokens: 420,
      cacheCreationInputTokens: 300
    });
  });

  it('preserves missing input fields in output-only streaming fragments', () => {
    expect(parseAnthropicUsage({ output_tokens: 45 })).toEqual({
      totalTokens: 45,
      outputTokens: 45
    });
  });

  it('does not infer a cache miss when Anthropic omits cache accounting', () => {
    expect(parseAnthropicUsage({ input_tokens: 2, output_tokens: 5 })).toEqual({
      totalTokens: 7,
      inputTokens: 2,
      outputTokens: 5
    });
  });
});

describe('parseOpenAiCompatibleUsage', () => {
  it('reads OpenRouter cache writes and reported zero reads from chat-completions usage', () => {
    expect(parseOpenAiCompatibleUsage({
      prompt_tokens: 4096,
      completion_tokens: 64,
      total_tokens: 4160,
      prompt_tokens_details: {
        cached_tokens: 0,
        cache_write_tokens: 4096
      }
    })).toEqual({
      totalTokens: 4160,
      inputTokens: 4096,
      outputTokens: 64,
      cachedInputTokens: 0,
      cacheMissInputTokens: 4096,
      cacheCreationInputTokens: 4096
    });
  });

  it('reads cache usage from Responses input token details', () => {
    expect(parseOpenAiCompatibleUsage({
      input_tokens: 5000,
      output_tokens: 80,
      input_tokens_details: {
        cached_tokens: 4200,
        cache_write_tokens: 0
      }
    })).toEqual({
      inputTokens: 5000,
      outputTokens: 80,
      cachedInputTokens: 4200,
      cacheMissInputTokens: 800,
      cacheCreationInputTokens: 0
    });
  });
});
