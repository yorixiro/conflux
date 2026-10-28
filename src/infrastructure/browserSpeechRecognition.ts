// Browser-owned recognition: no provider key or audio upload endpoint in the app.
// https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
export interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function createBrowserSpeechRecognition(): BrowserSpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const host = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}
