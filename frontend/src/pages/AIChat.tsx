import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, Trash2, Square, User2 } from '../components/icons';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { clearChat, streamChat } from '../api/chat';
import { cn } from '../lib/utils';
import type { ChatMessage } from '../api/types';

const SUGGESTIONS = [
  'Show me tasks completed last week',
  'List all active high-priority bugs',
  'Who has the most overdue work items?',
  'Summarize work item 12345',
];

marked.setOptions({ gfm: true, breaks: true });

function renderMarkdown(text: string): string {
  const html = marked.parse(text || '') as string;
  return DOMPurify.sanitize(html);
}

export default function AIChat() {
  const { push } = useToast();
  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem('chat.session');
    if (existing) return existing;
    // Mint a client-side session id up front so requests never share a
    // backend default session across users / tabs.
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('chat.session', fresh);
    return fresh;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Track message count so we can distinguish "new message appended" from
  // "existing assistant message updated by streaming chunk".
  const prevCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionId) localStorage.setItem('chat.session', sessionId);
  }, [sessionId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    // Coalesce scroll updates to one per animation frame to avoid layout
    // thrash when streaming chunks arrive rapidly. Use 'auto' for in-place
    // streaming updates and 'smooth' only when a new message is appended.
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isNewMessage ? 'smooth' : 'auto',
      });
      rafRef.current = null;
    });
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [messages]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !streaming,
    [input, streaming]
  );

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    const asstId = `a-${Date.now() + 1}`;
    const placeholder: ChatMessage = {
      id: asstId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { sessionId: newSession } = await streamChat(
        content,
        sessionId,
        (_chunk, full) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === asstId ? { ...msg, content: full } : msg
            )
          );
        },
        controller.signal
      );
      if (newSession) setSessionId(newSession);
      setMessages((m) =>
        m.map((msg) => (msg.id === asstId ? { ...msg, streaming: false } : msg))
      );
    } catch (e: any) {
      if (controller.signal.aborted) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId
              ? {
                  ...msg,
                  streaming: false,
                  content: msg.content || '_(stopped)_',
                }
              : msg
          )
        );
      } else {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId
              ? {
                  ...msg,
                  streaming: false,
                  content: `⚠️ ${e?.message || 'Request failed'}`,
                }
              : msg
          )
        );
        push(e?.message || 'Chat failed', 'error');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function mintSessionId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handleClear() {
    if (sessionId) {
      try {
        await clearChat(sessionId);
      } catch {
        /* ignore */
      }
    }
    setMessages([]);
    const fresh = mintSessionId();
    setSessionId(fresh);
    localStorage.setItem('chat.session', fresh);
    push('Conversation cleared', 'success');
  }

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask questions in plain English. Powered by GitHub Copilot."
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={handleClear}
            disabled={streaming}
          >
            Clear chat
          </Button>
        }
      />

      <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-sm">
                <Sparkles size={20} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                How can I help with your work items today?
              </h3>
              <p className="mt-1 max-w-md text-sm text-subtle">
                Ask about tasks, bugs, sprints, overdue work, or specific work item IDs.
              </p>
              <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-xl border border-border bg-elevated px-4 py-3 text-left text-sm transition hover:border-brand/40 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        <CardBody className="border-t border-border bg-surface">
          <form
            className="mx-auto flex w-full max-w-3xl items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="flex flex-1 items-end gap-2 rounded-2xl border border-border bg-elevated px-3 py-2 focus-within:ring-2 focus-within:ring-brand/30">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything about your work items… (Shift+Enter for newline)"
                className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-subtle"
              />
              {streaming ? (
                <Button
                  type="button"
                  variant="danger"
                  size="icon"
                  onClick={handleStop}
                  aria-label="Stop"
                >
                  <Square size={14} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="brand"
                  size="icon"
                  disabled={!canSend}
                  aria-label="Send"
                >
                  <Send size={14} />
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser ? 'bg-brand text-brand-fg' : 'bg-muted text-fg'
        )}
      >
        {isUser ? <User2 size={14} /> : <Sparkles size={14} />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft',
          isUser
            ? 'bg-brand text-brand-fg'
            : 'border border-border bg-elevated text-fg'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <>
            {message.content ? (
              <div
                className="md"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(message.content),
                }}
              />
            ) : null}
            {message.streaming && (
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
