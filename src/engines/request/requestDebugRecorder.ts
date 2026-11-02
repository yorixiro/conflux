import { isRequestDebugCaptureEnabled, isRoomRequestCaptureEnabled } from '../../app/developer/debugCaptureRuntime';
import type { AssistantReply } from '../chatApi';
import type { ProviderHttpRequest } from '../provider-runtime';
import type { AssistantRequestAudit } from './requestAudit';

type RequestDebugRecordOptions = {
  phase?: 'prepared' | 'completed' | 'failed';
  reply?: AssistantReply;
  error?: unknown;
  builtRequest?: ProviderHttpRequest | null;
};

export function recordRequestDebug(audit: AssistantRequestAudit, options?: RequestDebugRecordOptions) {
  if (!isRequestDebugCaptureEnabled() && !isRoomRequestCaptureEnabled(audit.collaboratorId)) return;

  void import('./requestDebugRuntime')
    .then(({ recordRequestDebugEntry }) => {
      recordRequestDebugEntry(audit, options);
    })
    .catch((error) => {
      console.warn('[polaris-request] failed to load request debug runtime', error);
    });
}
