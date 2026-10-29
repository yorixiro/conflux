import { useRef, useState } from 'react';

/** Development-only ACP connection surface. Credentials stay in Vite's server. */
export function DevinAcpConnectionPanel() {
  const [status, setStatus] = useState('尚未检测');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  async function check() {
    setStatus('正在检测…');
    try {
      const response = await fetch('/devin-acp/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json() as { running?: boolean; sessionReady?: boolean };
      setStatus(data.running ? (data.sessionReady ? 'Devin ACP 已连接' : '桥接在线，等待建立会话') : 'Devin ACP 进程未运行');
    } catch {
      setStatus('无法连接桥接服务：请确认 Ubuntu 中已启动桥接，并配置 Vite 代理');
    }
  }

  async function send() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setAnswer('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch('/devin-acp/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abort.signal
      });
      if (!response.ok || !response.body) {
        const error = await response.text();
        throw new Error(error || 'HTTP ' + response.status);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let output = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const line = event.split('\n').find((part) => part.startsWith('data: '));
          if (!line) continue;
          const message = JSON.parse(line.slice(6)) as {
            type: string;
            update?: { sessionUpdate?: string; content?: { type?: string; text?: string } };
            error?: string;
          };
          if (message.type === 'update' && message.update?.sessionUpdate === 'agent_message_chunk') {
            output += message.update.content?.text ?? '';
            setAnswer(output);
          } else if (message.type === 'error') {
            throw new Error(message.error || 'ACP error');
          }
        }
      }
      if (!output) setAnswer('ACP 请求已结束，但未收到文本消息。');
    } catch (error) {
      if (!abort.signal.aborted) setAnswer(error instanceof Error ? error.message : String(error));
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }

  async function cancel() {
    try { await fetch('/devin-acp/cancel', { method: 'POST' }); }
    finally { controller.current?.abort(); setBusy(false); }
  }

  return (
    <section className="api-provider-section api-provider-section-config">
      <div className="api-provider-section-head">
        <span className="api-provider-section-kicker">ACP Agent</span>
        <h3>Devin CLI · ACP</h3>
        <p>独立于 Base URL / API Key 的本地 Agent 连接。开发预览仅通过同源桥接访问。</p>
      </div>
      <div className="provider-stack">
        <p role="status">{status}</p>
        <button type="button" className="btn-secondary" onClick={() => { void check(); }}>检测 ACP 连接</button>
        <label htmlFor="devin-acp-prompt">发送测试消息</label>
        <textarea id="devin-acp-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="向 Devin 发送一条消息" />
        <div className="provider-inline-actions">
          <button type="button" className="btn-secondary" disabled={busy || !prompt.trim()} onClick={() => { void send(); }}>发送到 Devin</button>
          <button type="button" className="btn-secondary" disabled={!busy} onClick={() => { void cancel(); }}>停止</button>
        </div>
        {answer ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} aria-live="polite">{answer}</pre> : null}
      </div>
    </section>
  );
}
