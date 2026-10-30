import { useEffect, useId, useState } from 'react';

type AcpModel = { id: string; label: string };

type Props = {
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
};

/** ACP settings only: native agent status and models, never ordinary API credentials. */
export function DevinAcpConnectionPanel({ selectedModel = '', onSelectModel }: Props) {
  const modelId = useId();
  const [status, setStatus] = useState('正在连接本机 Devin…');
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<AcpModel[]>([]);
  const [modelMessage, setModelMessage] = useState('');

  async function check() {
    if (checking) return;
    setChecking(true);
    try {
      const response = await fetch('/devin-acp/health', { cache: 'no-store' });
      const data = await response.json().catch(() => null) as {
        running?: boolean; sessionReady?: boolean; error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error || 'HTTP ' + response.status);
      const running = data?.running === true;
      setStatus(running ? 'Devin 桥接在线' : (data?.error || 'Devin 子进程未运行，请检查 Ubuntu 里的 Devin CLI'));
    } catch (error) {
      setStatus(error instanceof Error ? '连接失败：' + error.message : '无法连接 Devin 桥接');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    // Check once when this API detail view opens; no polling or paid model calls.
    void check();
  }, []);

  async function refreshModels() {
    if (loading) return;
    setLoading(true);
    setModelMessage('正在获取 Devin 模型…');
    try {
      const response = await fetch('/devin-acp/models', { cache: 'no-store' });
      const data = await response.json().catch(() => null) as {
        models?: AcpModel[]; error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error || 'HTTP ' + response.status);
      const next = Array.isArray(data?.models)
        ? data.models.filter((model) => typeof model?.id === 'string' && typeof model?.label === 'string')
        : [];
      setModels(next);
      setModelMessage(next.length
        ? '可用模型已更新'
        : 'Devin 未公开可选模型，仍可直接使用默认模型聊天');
    } catch (error) {
      setModelMessage(error instanceof Error ? error.message : '无法获取模型列表');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="api-provider-section api-provider-section-config" aria-label="Devin ACP 连接">
      <div className="api-provider-section-head">
        <p>本机代理连接，无需填写普通 API 地址、密钥或 Token。</p>
      </div>
      <div className="provider-stack">
        <div className="provider-inline-actions">
          <p role="status" aria-live="polite">{status}</p>
          <button className="btn-secondary compact" type="button" onClick={() => void check()} disabled={checking}>
            {checking ? '连接中…' : '重试连接'}
          </button>
        </div>
        <div className="settings-form">
          <label htmlFor={modelId}>聊天模型</label>
          <select id={modelId} value={selectedModel}
            disabled={!onSelectModel}
            onChange={(event) => onSelectModel?.(event.target.value)}>
            <option value="">Devin 默认模型</option>
            {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            {selectedModel && !models.some((model) => model.id === selectedModel)
              ? <option value={selectedModel}>{selectedModel}（已保存）</option>
              : null}
          </select>
          <button className="btn-secondary compact" type="button"
            disabled={loading} onClick={() => void refreshModels()}>
            {loading ? '拉取中…' : '拉取模型列表'}
          </button>
          {modelMessage ? <p className="api-provider-inline-note" role="status">{modelMessage}</p> : null}
        </div>
        {onSelectModel ? <p className="api-provider-inline-note">
          选好后返回正式聊天窗口发送消息。无可选模型时直接使用默认模型。
        </p> : null}
      </div>
    </section>
  );
}
