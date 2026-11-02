import { isDeveloperModeEnabled } from './developerModeRuntime';

function hasQueryFlag(name: string) {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(name) === '1';
  } catch {
    return false;
  }
}

export function isRequestDebugCaptureEnabled() {
  return isDeveloperModeEnabled() || hasQueryFlag('debugRequest');
}

export function isChatQaAuditCaptureEnabled() {
  return isRequestDebugCaptureEnabled() || hasQueryFlag('debugQa');
}

export function isModelFlowTraceCaptureEnabled() {
  return isChatQaAuditCaptureEnabled() || hasQueryFlag('debugFlow');
}

// Room request capture is opt-in, session-scoped and never enables the global debug overlay.
const ROOM_REQUEST_CAPTURE_KEY = 'conflux:room-request-capture-id';
export const ROOM_REQUEST_CAPTURE_EVENT = 'conflux:room-request-capture-updated';

export function readRoomRequestCaptureId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(ROOM_REQUEST_CAPTURE_KEY) || null; }
  catch { return null; }
}

export function isRoomRequestCaptureEnabled(collaboratorId: string | null | undefined): boolean {
  return Boolean(collaboratorId && readRoomRequestCaptureId() === collaboratorId);
}

export function setRoomRequestCaptureId(collaboratorId: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (collaboratorId) window.sessionStorage.setItem(ROOM_REQUEST_CAPTURE_KEY, collaboratorId);
    else window.sessionStorage.removeItem(ROOM_REQUEST_CAPTURE_KEY);
    window.dispatchEvent(new Event(ROOM_REQUEST_CAPTURE_EVENT));
    return true;
  } catch {
    return false;
  }
}
