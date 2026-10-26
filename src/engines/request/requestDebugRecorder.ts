import { isRequestDebugCaptureEnabled } from '../../app/developer/debugCaptureRuntime';
import type { AssistantReply } from '../chatApi';
import type { ProviderHttpRequest } from '../provider-runtime';
import type { AssistantRequestAudit } from './requestAudit';
import { recordRequestInsight } from './requestInsightRuntime';

type RequestDebugRecordOptions = {
  phase?: 'prepared' | 'completed' | 'failed';
  reply?: AssistantReply;
  error?: unknown;
  builtRequest?: ProviderHttpRequest | null;
};

export function recordRequestDebug(audit: AssistantRequestAudit, options?: RequestDebugRecordOptions) {
  // Lightweight, text-free request counts are available in ordinary Usage settings.
  // Full prompt/request capture remains explicitly developer-only.
  try {
    recordRequestInsight(audit, options);
  } catch {
    // A diagnostic view must never prevent the actual model request from running.
  }
  if (!isRequestDebugCaptureEnabled()) return;

  void import('./requestDebugRuntime')
    .then(({ recordRequestDebugEntry }) => {
      recordRequestDebugEntry(audit, options);
    })
    .catch((error) => {
      console.warn('[polaris-request] failed to load request debug runtime', error);
    });
}
