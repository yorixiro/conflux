import { useEffect, useRef, useState } from 'react';
import { createBrowserSpeechRecognition, type BrowserSpeechRecognition } from '../../../../infrastructure/browserSpeechRecognition';

const errors: Record<string, string> = {
  'not-allowed': '麦克风权限未开启，请在浏览器的网站权限中允许麦克风后重试。',
  'service-not-allowed': '浏览器未允许语音识别服务，可使用系统键盘的话筒输入。',
  'audio-capture': '无法使用麦克风，请检查是否被其他应用占用。',
  network: '语音识别服务连接失败，请检查网络后重试。',
  'no-speech': '没有听到语音，点击话筒再试一次。',
  'language-not-supported': '语音服务不支持当前语言，可使用系统键盘的话筒输入。'
};

export function useComposerDictation({ conversationId, enabled, language, onText }: {
  conversationId: string | null;
  enabled: boolean;
  language: string;
  onText: (text: string) => void;
}) {
  const current = useRef<BrowserSpeechRecognition | null>(null);
  const scope = useRef(conversationId);
  const deliver = useRef(onText);
  const allowed = useRef(enabled);
  scope.current = conversationId;
  deliver.current = onText;
  allowed.current = enabled;
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function cancel() {
    const recognition = current.current;
    current.current = null;
    if (recognition) {
      recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
      recognition.abort();
    }
    setPhase('idle');
    setMessage('');
    setIsError(false);
  }

  useEffect(() => {
    cancel();
    const cancelWhenHidden = () => { if (document.hidden) cancel(); };
    document.addEventListener('visibilitychange', cancelWhenHidden);
    window.addEventListener('pagehide', cancel);
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', cancelWhenHidden);
      window.removeEventListener('pagehide', cancel);
    };
  }, [conversationId, enabled]);

  function toggle() {
    if (current.current) {
      if (phase === 'stopping') return;
      setPhase('stopping');
      setMessage('正在整理文字…');
      current.current.stop();
      return;
    }
    if (!allowed.current) return;
    setIsError(false);
    const recognition = createBrowserSpeechRecognition();
    if (!recognition) {
      setIsError(true);
      setMessage('此浏览器不支持语音转文字，请使用系统键盘的话筒输入。');
      return;
    }
    const startedIn = conversationId;
    const live = () => current.current === recognition && scope.current === startedIn && allowed.current;
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { if (live()) { setPhase('listening'); setMessage('正在听，点击话筒结束'); } };
    recognition.onresult = (event) => {
      if (!live()) return;
      let finalized = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalized += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalized.trim()) deliver.current(finalized.trim());
      setMessage(interim || '正在听，点击话筒结束');
    };
    recognition.onerror = (event) => {
      if (!live()) return;
      current.current = null;
      recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
      recognition.abort();
      setPhase('idle');
      setIsError(event.error !== 'aborted');
      setMessage(event.error === 'aborted' ? '' : errors[event.error] || '语音识别未完成，请重试。');
    };
    recognition.onend = () => { if (live()) { current.current = null; setPhase('idle'); setMessage(''); } };
    current.current = recognition;
    setPhase('starting');
    setMessage('正在开启麦克风…');
    try { recognition.start(); } catch {
      cancel();
      setIsError(true);
      setMessage('麦克风未能启动，请检查浏览器权限后重试。');
    }
  }

  return { active: phase !== 'idle', message, isError, toggle, cancel };
}
