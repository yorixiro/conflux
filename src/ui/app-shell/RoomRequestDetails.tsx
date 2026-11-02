import { useEffect, useState } from 'react';
import {
  readRequestDebugEntries,
  REQUEST_DEBUG_EVENT,
  type RequestDebugEntry
} from '../../engines/request/requestDebugRuntime';
import {
  isRequestDebugCaptureEnabled,
  isRoomRequestCaptureEnabled,
  readRoomRequestCaptureId,
  ROOM_REQUEST_CAPTURE_EVENT,
  setRoomRequestCaptureId
} from '../../app/developer/debugCaptureRuntime';
import { readLocalRuntimeLogEntries, type LocalRuntimeLogEntry } from '../../app/shell/localRuntimeLog';

type Mode = 'preview' | 'logs';

function readRoomEntries(id: string) {
  // Never infer ownership from a role name; identical names may belong to different rooms.
  return readRequestDebugEntries()
    .filter((entry) => (entry.collaboratorId ?? entry.inspector?.header.collaboratorId) === id)
    .sort((a, b) => b.at - a.at);
}

function formatTime(at: number) {
  return new Date(at).toLocaleString();
}

const statusNames: Record<RequestDebugEntry['promptParts'][number]['status'], string> = {
  kept: '保留',
  disabled: '未启用',
  dropped_budget: '预算截断'
};

export function RoomRequestDetails({ collaboratorId, mode }: {
  collaboratorId: string;
  mode: Mode;
}) {
  const [requests, setRequests] = useState<RequestDebugEntry[]>(() => readRoomEntries(collaboratorId));
  const [logs, setLogs] = useState<LocalRuntimeLogEntry[]>(() => readLocalRuntimeLogEntries(50));
  const [showRequestBody, setShowRequestBody] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [captureId, setCaptureId] = useState(readRoomRequestCaptureId);
  const refresh = () => {
    setRequests(readRoomEntries(collaboratorId));
    setLogs(readLocalRuntimeLogEntries(50));
  };

  useEffect(() => {
    refresh();
    const syncCapture = () => setCaptureId(readRoomRequestCaptureId());
    window.addEventListener(REQUEST_DEBUG_EVENT, refresh);
    window.addEventListener(ROOM_REQUEST_CAPTURE_EVENT, syncCapture);
    return () => {
      window.removeEventListener(REQUEST_DEBUG_EVENT, refresh);
      window.removeEventListener(ROOM_REQUEST_CAPTURE_EVENT, syncCapture);
    };
  }, [collaboratorId]);

  const latest = requests[0] ?? null;
  const captured = isRequestDebugCaptureEnabled() || isRoomRequestCaptureEnabled(collaboratorId);
  return (
    <section className="conflux-room-request-details">
      <div className="conflux-room-request-toolbar">
        <p className="conflux-room-settings-note">
          {mode === 'preview'
            ? '仅显示当前角色已记录的实际模型请求。打开预览不会发送新请求。'
            : '这里包含应用级日志；不代表全部记录都属于当前角色。'}
        </p>
        <button type="button" className="conflux-room-request-refresh" onClick={refresh}>刷新</button>
      </div>

      {mode === 'preview' ? (
        <>
          <div className="conflux-room-request-capture">
            <p className="conflux-room-settings-note">
              {captureId === collaboratorId
                ? '正在记录此角色之后的请求。记录保存在本机，可能包含聊天、记忆与附件；停止记录不会自动删除旧记录。'
                : '可临时记录此角色之后的真实请求。默认关闭，记录可能包含私人内容，不会调用付费模型。'}
            </p>
            {isRequestDebugCaptureEnabled() ? (
              <p className="conflux-room-settings-note">开发调试正在记录请求，包含其他角色。此页只展示当前角色的记录。</p>
            ) : (
              <button type="button" className="conflux-room-request-refresh"
                onClick={() => {
                  const next = captureId === collaboratorId ? null : collaboratorId;
                  if (setRoomRequestCaptureId(next)) setCaptureId(next);
                  else window.alert('当前浏览器无法保存请求记录开关。');
                }}>
                {captureId === collaboratorId ? '停止此角色记录' : '开启此角色请求记录'}
              </button>
            )}
          </div>
          {!latest ? (
          <p className="conflux-room-settings-note" role="status">
            {captured
              ? '当前角色暂无请求记录。发送消息后再查看；不会为预览自动调用模型。'
              : '当前角色没有记录。开启上方开关，再发送一条消息后即可查看，不会读取其他角色的记录。'}
          </p>
        ) : (
          <>
            <div className="conflux-room-request-meta">
              <strong>{latest.modelId}</strong>
              <span>{formatTime(latest.at)} · {latest.phase === 'failed' ? '失败' : latest.phase === 'completed' ? '完成' : '准备'}</span>
              <span>上下文预估 {latest.inspector.totals.estimatedTokens} tokens · 工具 {latest.tooling.toolCount}</span>
            </div>
            <p className="conflux-room-settings-note">
              下列片段来自当次请求组装记录，状态按当次预算计算；只有存在已构建的请求体时，才能查看请求体原文。
            </p>
            {latest.promptParts.map((part, index) => (
              <details key={part.name + ':' + index} className="conflux-room-request-part">
                <summary>
                  <span>{part.name}</span>
                  <small>{statusNames[part.status]}</small>
                </summary>
                <pre>{part.content || '（空）'}</pre>
              </details>
            ))}
            <div className="conflux-room-request-counts">
              历史消息：保留 {latest.inspector.context.keptMessageCount} 条 ·
              丢弃 {latest.inspector.context.droppedHistoryCount + latest.inspector.context.droppedMessageLimitCount} 条
            </div>
            {latest.outboundRequest ? (
              <>
                <button type="button" className="conflux-room-request-refresh" onClick={() => setShowRequestBody((value) => !value)}>
                  {showRequestBody ? '隐藏实际请求体' : '查看实际请求体（可能包含隐私）'}
                </button>
                {showRequestBody ? (
                  <pre className="conflux-room-request-raw">{JSON.stringify(latest.outboundRequest.body, null, 2)}</pre>
                ) : null}
              </>
            ) : (
              <p className="conflux-room-settings-note">本条调试记录没有保存实际请求体，不能将拼装记录当作已发送原文。</p>
            )}
            <p className="conflux-room-settings-note">
              请求记录只在已启用调试捕获时产生，可能含聊天、记忆及附件信息。这里不发送、修改或清理记录。
            </p>
          </>
        )}
        </>
      ) : (
        <>
          <p className="conflux-room-settings-note">当前角色请求记录：{requests.length} 条。应用日志按最新时间显示。</p>
          {logs.length === 0 ? <p className="conflux-room-settings-note">暂无应用日志。</p> : (
            <div className="conflux-room-request-log-list">
              {logs.map((entry) => (
                <details key={entry.id} className="conflux-room-request-part">
                  <summary>
                    <span>{entry.title}</span>
                    <small>{entry.source} · {formatTime(entry.at)}</small>
                  </summary>
                  <p>{entry.detail}</p>
                </details>
              ))}
            </div>
          )}
          {latest ? (
            <button type="button" className="conflux-room-request-refresh"
              onClick={() => setShowContent((value) => !value)}>
              {showContent ? '收起当前角色请求' : '查看当前角色最近请求'}
            </button>
          ) : null}
          {latest && showContent ? (
            <div className="conflux-room-request-meta">
              <strong>{latest.modelId}</strong>
              <span>{formatTime(latest.at)} · {latest.phase}</span>
              <span>预估 {latest.inspector.totals.estimatedTokens} tokens</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
