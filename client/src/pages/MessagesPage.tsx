import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Send, ArrowLeft, Check, CheckCheck, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchConversations, sendMessage as sendMessageApi, markRead } from '../lib/api';
import { Avatar, SignInRequired, PageLoader, SafeImage } from '../components/ui';
import { ReportButton } from '../components/ReportModal';
import type { Conversation } from '../types';

const POLL_MS = 15000;

export function MessagesPage() {
  const { navigate, auth, authLoading, refreshNotifications } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const load = useCallback(async () => {
    try {
      const convos = await fetchConversations();
      setConversations(convos);
      // If new messages arrived in the open conversation, mark them read.
      const open = convos.find((c) => c.id === activeRef.current);
      if (open && open.unread > 0) {
        markRead(open.listingId, open.participantId).then(refreshNotifications).catch(() => {});
        setConversations((prev) => prev.map((c) => (c.id === open.id ? { ...c, unread: 0 } : c)));
      }
    } catch { /* keep last good state */ }
    setLoading(false);
  }, [refreshNotifications]);

  useEffect(() => {
    if (!auth) return;
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [auth?.id, load]);

  const active = conversations.find((c) => c.id === activeId) || null;
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [activeId, active?.messages.length]);

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to see your messages." />;
  if (loading) return <PageLoader />;

  const q = search.toLowerCase();
  const filtered = conversations.filter((c) => c.participantName.toLowerCase().includes(q) || c.listingTitle.toLowerCase().includes(q));

  const select = (c: Conversation) => {
    setActiveId(c.id);
    setDraft('');
    setSendError('');
    if (c.unread > 0) {
      markRead(c.listingId, c.participantId).then(refreshNotifications).catch(() => {});
      setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
    }
  };

  const send = async () => {
    if (!draft.trim() || !active || sending) return;
    const text = draft.trim();
    const temp = { id: `temp-${Date.now()}`, sender: 'me' as const, text, time: new Date().toISOString(), read: false };
    setSending(true);
    setSendError('');
    setDraft('');
    setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, temp], lastMessage: text, lastMessageTime: temp.time } : c)));
    try {
      await sendMessageApi({ propertyId: active.listingId, receiverId: active.participantId, text });
    } catch (err) {
      setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, messages: c.messages.filter((m) => m.id !== temp.id) } : c)));
      setDraft(text);
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-ink-50/30 dark:bg-ink-950">
      <div className="container-page py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink-900 dark:text-white">Messages</h1>
        <div className="card flex h-[calc(100vh-190px)] min-h-[480px] overflow-hidden">
          <div className={`flex w-full flex-col border-r border-ink-100 dark:border-ink-800 md:w-80 lg:w-96 ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="border-b border-ink-100 p-3 dark:border-ink-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="input w-full pl-9" aria-label="Search conversations" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length ? filtered.map((c) => (
                <button key={c.id} onClick={() => select(c)} className={`flex w-full items-center gap-3 border-b border-ink-50 px-4 py-3 text-left dark:border-ink-800/50 ${activeId === c.id ? 'bg-brand-50/60 dark:bg-brand-900/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'}`}>
                  <div className="relative shrink-0">
                    <Avatar src={c.participantAvatar} name={c.participantName} className="h-11 w-11 rounded-full object-cover" />
                    {c.unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-bold' : 'font-medium'} text-ink-900 dark:text-ink-100`}>{c.participantName}</span>
                      <span className="shrink-0 text-[10px] text-ink-400">{formatTime(c.lastMessageTime)}</span>
                    </div>
                    <p className="truncate text-xs text-ink-400">{c.listingTitle}</p>
                    <p className={`mt-0.5 truncate text-xs ${c.unread ? 'font-semibold text-ink-800 dark:text-ink-200' : 'text-ink-500'}`}>{c.lastMessage}</p>
                  </div>
                </button>
              )) : (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <MessageCircle className="h-10 w-10 text-ink-300" />
                  <p className="mt-2 text-sm font-semibold">No conversations yet</p>
                  <p className="mt-1 text-xs text-ink-400">Message an owner from any listing page.</p>
                  <button onClick={() => navigate('/search')} className="btn-primary mt-4 text-xs">Find a PG</button>
                </div>
              )}
            </div>
          </div>

          <div className={`flex flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                  <button onClick={() => setActiveId(null)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
                  <Avatar src={active.participantAvatar} name={active.participantName} className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    {active.participantDeleted
                      ? <p className="text-sm font-semibold">{active.participantName}</p>
                      : <button onClick={() => navigate(`/user/${active.participantId}`)} className="truncate text-sm font-semibold text-ink-900 hover:underline dark:text-ink-100">{active.participantName}</button>}
                    <p className="truncate text-xs text-ink-400">{active.participantRole === 'owner' ? 'Host' : 'Tenant'}</p>
                  </div>
                  {!active.participantDeleted && <ReportButton targetType="user" targetId={active.participantId} />}
                </div>

                {active.listingId && (
                  <button onClick={() => navigate(`/listing/${active.listingId}`)} className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-2 text-left dark:border-ink-800 dark:bg-ink-900/50">
                    <SafeImage src={active.listingImage} alt={active.listingTitle} width={80} className="h-10 w-14 rounded-lg object-cover" />
                    <div className="min-w-0"><p className="truncate text-xs font-semibold">{active.listingTitle}</p><p className="text-[10px] text-ink-400">View listing</p></div>
                  </button>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="mx-auto max-w-xl space-y-3">
                    {active.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender === 'me' ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100'}`}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.sender === 'me' ? 'text-white/75' : 'text-ink-400'}`}>
                            {formatTime(m.time)}
                            {m.sender === 'me' && (m.read ? <CheckCheck className="h-3 w-3" aria-label="Read" /> : <Check className="h-3 w-3" aria-label="Sent" />)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800">
                  {sendError && <p className="mx-auto mb-2 max-w-xl text-xs text-danger">{sendError}</p>}
                  {active.participantDeleted ? (
                    <p className="text-center text-xs text-ink-500">This person has closed their account.</p>
                  ) : (
                    <div className="mx-auto flex max-w-xl items-center gap-2">
                      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()} maxLength={2000} placeholder="Write a message" className="input flex-1" aria-label="Message" />
                      <button onClick={send} disabled={!draft.trim() || sending} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"><Send className="h-4 w-4" /></button>
                    </div>
                  )}
                  <p className="mx-auto mt-2 max-w-xl text-[10px] text-ink-400">Never share OTPs or bank details. Don't pay before visiting.</p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <MessageCircle className="h-12 w-12 text-ink-300" />
                <h3 className="mt-3 text-base font-semibold">Select a conversation</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 2) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
