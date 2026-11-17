import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/provider-relay';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }])
}));

function response() {
  const chunks: string[] = [];
  const res = {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    setHeader: vi.fn(),
    status(code: number) { this.statusCode = code; return this; },
    write(chunk: Uint8Array) { chunks.push(Buffer.from(chunk).toString()); return true; },
    end() { this.writableEnded = true; },
    send(value: string) { chunks.push(value); this.end(); },
    json(value: unknown) { chunks.push(JSON.stringify(value)); this.end(); }
  };
  return { res, text: () => chunks.join('') };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('provider relay model-list fallback', () => {
  it('relays an authenticated model-list GET without a body or redirect following', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'live-model' }] })));
    vi.stubGlobal('fetch', fetchMock);
    const output = response();
    await handler({ method: 'POST', headers: {}, body: {
      endpoint: 'https://api.example.com/v1/models', method: 'GET',
      headers: { Authorization: 'Bearer test-only', Host: 'ignored.example' }
    } } as VercelRequest, output.res as unknown as VercelResponse);

    expect(output.res.statusCode).toBe(200);
    expect(JSON.parse(output.text())).toEqual({ data: [{ id: 'live-model' }] });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://api.example.com/v1/models', {
      method: 'GET', headers: { Authorization: 'Bearer test-only' }, redirect: 'error'
    });
  });

  it.each([
    ['GET', 'https://api.example.com/v1/chat/completions'],
    ['GET', 'https://127.0.0.1/v1/models'],
    ['DELETE', 'https://api.example.com/v1/models']
  ])('rejects %s to %s before contacting an upstream', async (method, endpoint) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const output = response();
    await handler({ method: 'POST', headers: {}, body: {
      endpoint, method, headers: { Authorization: 'Bearer test-only' }
    } } as VercelRequest, output.res as unknown as VercelResponse);
    expect(output.res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves the existing chat POST contract when no method is supplied', async () => {
    const fetchMock = vi.fn(async () => new Response('chat response'));
    vi.stubGlobal('fetch', fetchMock);
    const output = response();
    const body = { model: 'test', messages: [{ role: 'user', content: 'hello' }] };
    await handler({ method: 'POST', headers: {}, body: {
      endpoint: 'https://api.example.com/v1/chat/completions',
      headers: { Authorization: 'Bearer test-only' }, body
    } } as VercelRequest, output.res as unknown as VercelResponse);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://api.example.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer test-only' }, body: JSON.stringify(body)
    });
    expect(output.text()).toBe('chat response');
  });
});
