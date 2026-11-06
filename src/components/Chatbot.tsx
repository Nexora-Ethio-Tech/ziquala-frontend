import { publicText as uiText } from "../publicLocalization";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MinusCircle, Maximize2 } from 'lucide-react';
import {API_BASE_URL} from "../config/api";

const ChatMessage = lazy(() => import('./ChatMessage'));

export const Chatbot = () => {
  useTranslation('public');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "chat.helloIAmTheZiqualaAboSchoolAssistantICanHelpYouWithSchoolPolicies" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const requestGeneration = useRef(0);
  const sendingRef = useRef(false);

  useEffect(() => () => { requestGeneration.current += 1; requestRef.current?.abort(); }, []);

  const clearConversation = () => {
    requestGeneration.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    sendingRef.current = false;
    setIsLoading(false);
    setMessage('');
    setMessages([{ role: 'assistant', content: 'chat.helloIAmTheZiqualaAboSchoolAssistantICanHelpYouWithSchoolPolicies' }]);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const clamp = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(current => {
        if (!current) return current;
        const x = Math.max(16, Math.min(innerWidth - rect.width - 16, current.x));
        const y = Math.max(16, Math.min(innerHeight - rect.height - 16, current.y));
        return x === current.x && y === current.y ? current : { x, y };
      });
    };
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
    if (!isOpen && wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const saved = localStorage.getItem('ziquala_chatbot_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setPosition(parsed);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Failed to parse saved chatbot position', error);
      }
    }
  }, []);

  useEffect(() => {
    if (position) {
      localStorage.setItem('ziquala_chatbot_position', JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    const maxX = window.innerWidth - rect.width - 16;
    const maxY = window.innerHeight - rect.height - 16;

    setPosition({
      x: Math.max(16, Math.min(maxX, newX)),
      y: Math.max(16, Math.min(maxY, newY))
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button && button.dataset.dragHandle !== 'true') return;

    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsDragging(true);
    wrapperRef.current?.setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendingRef.current) return;
    sendingRef.current = true;
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    const userMessage = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage(uiText(""));
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/guest/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(item => ({
            ...item,
            content: item.role === 'assistant' && item.content.startsWith('chat.') ? uiText(item.content) : item.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      // Safety check in case of error payload returning cleanly but missing "content"
      if (data.error || typeof data.content !== 'string' || !data.content.trim()) {
        throw new Error('Invalid assistant response');
      }

      if (generation === requestGeneration.current) setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Chat error:", err);
      if (generation === requestGeneration.current) setMessages(prev => [...prev, { role: "assistant", content: "chat.errorCouldNotReachTheServerPleaseTryAgainLater" }]);
    } finally {
      window.clearTimeout(timeout);
      if (generation === requestGeneration.current) { sendingRef.current = false; requestRef.current = null; setIsLoading(false); }
    }
  };

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        data-school-chat-launcher
        onClick={() => setIsOpen(true)}
        aria-label={uiText("chat.askAssistant")}
        title={uiText("chat.askAssistant")}
        className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 hover:bg-blue-700 z-50"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  const positionStyle = position ? { left: position.x, top: position.y, touchAction: 'none' } : undefined;
  const floatingClasses = position ? '' : 'right-6 bottom-6';

  return (
    <div ref={wrapperRef} role="dialog" aria-labelledby="school-chat-title" data-school-chat onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setIsOpen(false); } }} style={positionStyle} className={`fixed z-50 transition-all duration-300 ${floatingClasses} ${isMinimized ? 'w-64' : 'w-[calc(100vw-3rem)] max-w-96 h-[min(500px,calc(100dvh-3rem))]'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div onPointerDown={handlePointerDown} className={`bg-blue-600 p-4 text-white flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div aria-hidden="true" className="hidden bg-white/20 p-2 rounded-lg md:block">
              <MessageSquare size={20} />
            </div>
            <div className="min-w-0">
              <h2 id="school-chat-title" className="truncate font-bold text-sm">{uiText("chat.ziqualaAboSchoolAssistant")}</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-[10px] text-white">{uiText("chat.semanticSearchActive")}</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              data-drag-handle="true"
              onPointerDown={handlePointerDown}
              onKeyDown={event => {
                const delta = ({ ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] } as Record<string, number[]>)[event.key];
                const rect = wrapperRef.current?.getBoundingClientRect();
                if (!delta || !rect) return;
                event.preventDefault();
                setPosition({x: Math.max(16, Math.min(window.innerWidth - rect.width - 16, rect.left + delta[0])), y: Math.max(16, Math.min(window.innerHeight - rect.height - 16, rect.top + delta[1]))});
              }}
              className="grid h-9 w-9 place-items-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={uiText("chat.dragChatbot")}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            >
              <span className="text-xs font-bold">{uiText("⋮⋮")}</span>
            </button>
            <button aria-label={uiText(isMinimized ? 'chat.restore' : 'chat.minimize')} aria-expanded={!isMinimized} onClick={() => setIsMinimized(!isMinimized)} className="grid h-9 w-9 place-items-center hover:bg-white/10 rounded-lg transition-colors">
              {isMinimized ? <Maximize2 size={16} /> : <MinusCircle size={16} />}
            </button>
            <button aria-label={uiText('copy.close')} onClick={() => setIsOpen(false)} className="grid h-9 w-9 place-items-center hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div role="log" tabIndex={0} aria-label={uiText('chat.ziqualaAboSchoolAssistant')} aria-live="polite" aria-relevant="additions text" aria-busy={isLoading} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                    }`}>
                    <Suspense fallback={m.role === 'user' ? m.content : uiText(m.content)}>
                      <ChatMessage>{m.role === 'user' ? m.content : uiText(m.content)}</ChatMessage>
                    </Suspense>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex w-full justify-start">
                  <div className="flex max-w-[85%] flex-row gap-3">
                    <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 rounded-3xl rounded-bl-md px-5 py-4 shadow-sm flex items-center gap-1.5 h-[52px]">
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="h-2" />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  aria-label={uiText('chat.typeYourQuestion')}
                  type="text"
                  maxLength={2000}
                  placeholder={uiText("chat.typeYourQuestion")}
                  className="min-w-0 flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  aria-label={uiText('contact.send')}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="mt-2 flex items-start gap-3">
                <p className="min-w-0 flex-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{uiText('copy.chatPrivacyNotice')}</p>
                <button type="button" onClick={clearConversation} className="min-h-11 max-w-24 shrink-0 text-xs font-bold underline">{uiText('copy.clearChat')}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
