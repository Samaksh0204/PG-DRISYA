import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send, ArrowLeft, Check, CheckCheck, MessageCircle, AlertCircle, RotateCw, X, Ban, ShieldAlert, WifiOff, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchConversations, fetchThread, sendMessage as sendMessageApi, markRead, blockUser, unblockUser, newClientId, ApiError } from '../lib/api';
import { Avatar, SignInRequired, PageLoader, SafeImage } from '../components/ui';
import { ReportButton } from '../components/ReportModal';
import { routeParams } from '../lib/format';
import type { Conversation, Message, ThreadPage } from '../types';

const LIST_POLL_MS = 15000;
const THREAD_POLL_MS = 5000;

type Key = { participantId: string; listingId: string };
const keyOf = (k: Key) => `${k.listingId || 'none'}-${k.participantId}`;

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function MessagesPage() {
  const { navigate, route, auth, authLoading, refreshNotifications } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listError, setListError] = useState('');
  const [active, setActive] = useState<Key | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const online = useOnline();

  // /messages?with=<userId>&property=<listingId> opens that conversation (e.g. from a listing).
  useEffect(() => {
    const p = routeParams(route);
    const withId = p.get('with');
    if (withId) setActive({ participantId: withId, listingId: p.get('property') || '' });
  }, [route]);

  const loadList = useCallback(async () => {
    try {
      setConversations(await fetchConversations());
      setListError('');
    } catch (e) {
      setListError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadList();
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [auth?.id, loadList]);

  const activeKey = active ? keyOf(active) : null;
  const activeSummary = conversations.find((c) => c.id === activeKey) || null;

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired message="Log in to see your messages." />;
  if (loading) return <PageLoader />;

  const q = search.toLowerCase();
  const filtered = conversations.filter((c) => c.participantName.toLowerCase().includes(q) || c.listingTitle.toLowerCase().includes(q));

  const select = (c: Conversation) => {
    setActive({ participantId: c.participantId, listingId: c.listingId });
    if (c.unread > 0) setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
  };

  return (
    <div className="bg-ink-50/30 dark:bg-ink-950">
      <div className="container-page py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink-900 dark:text-white">Messages</h1>
        {!online && (
          <p role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <WifiOff className="h-4 w-4" /> You're offline. New messages will appear when you reconnect.
          </p>
        )}
        <div className="card flex h-[calc(100dvh-190px)] min-h-[480px] overflow-hidden">
          <div className={`flex w-full flex-col border-r border-ink-100 dark:border-ink-800 md:w-80 lg:w-96 ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="border-b border-ink-100 p-3 dark:border-ink-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="input w-full pl-9" aria-label="Search conversations" />
              </div>
            </div>
            {listError && (
              <p className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-2 text-xs text-danger dark:border-ink-800">
                {listError} <button onClick={loadList} className="font-semibold underline">Retry</button>
              </p>
            )}
            <div className="flex-1 overflow-y-auto">
              {filtered.length ? filtered.map((c) => (
                <button key={c.id} onClick={() => select(c)} className={`flex w-full items-center gap-3 border-b border-ink-50 px-4 py-3 text-left dark:border-ink-800/50 ${activeKey === c.id ? 'bg-brand-50/60 dark:bg-brand-900/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'}`}>
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
                    <p className={`mt-0.5 truncate text-xs ${c.unread ? 'font-semibold text-ink-800 dark:text-ink-200' : 'text-ink-500'}`}>{c.blockedByMe ? 'Blocked' : c.lastMessage}</p>
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

          <div className={`flex min-w-0 flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
            {active ? (
              <ThreadPane
                key={activeKey!}
                target={active}
                summary={activeSummary}
                online={online}
                onBack={() => setActive(null)}
                onChanged={() => { loadList(); refreshNotifications(); }}
              />
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

function ThreadPane({ target, summary, online, onBack, onChanged }: { target: Key; summary: Conversation | null; online: boolean; onBack: () => void; onChanged: () => void }) {
  const { navigate, toast } = useApp();
  const [thread, setThread] = useState<Omit<ThreadPage, 'messages'> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [warning, setWarning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastServerTime = useRef<string | null>(null);
  // The parent passes a new callback each render; don't let that reload the thread.
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const serverMessages = useMemo(() => messages.filter((m) => !m.pending && !m.failed), [messages]);
  useEffect(() => { lastServerTime.current = serverMessages[serverMessages.length - 1]?.time || null; }, [serverMessages]);

  const markSeen = useCallback((msgs: Message[]) => {
    if (msgs.some((m) => m.sender === 'them' && !m.read)) {
      markRead(target.listingId, target.participantId).then(() => onChangedRef.current()).catch(() => {});
    }
  }, [target.listingId, target.participantId]);

  const loadLatest = useCallback(async () => {
    setLoadError('');
    try {
      const page = await fetchThread(target.participantId, target.listingId || null);
      const { messages: msgs, ...rest } = page;
      setThread(rest);
      // Keep messages still sending (or failed) from this tab.
      setMessages((prev) => [...msgs, ...prev.filter((m) => (m.pending || m.failed) && !msgs.some((x) => x.clientId && x.clientId === m.clientId))]);
      markSeen(msgs);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [target.participantId, target.listingId, markSeen]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  // Poll for new messages (from the other person, or from this account on another device).
  const pollNew = useCallback(async () => {
    if (!lastServerTime.current) return loadLatest();
    try {
      const page = await fetchThread(target.participantId, target.listingId || null, { after: lastServerTime.current });
      const { messages: fresh, ...rest } = page;
      setThread(rest);
      if (!fresh.length) return;
      setMessages((prev) => {
        // A message we sent from this tab comes back from the server: replace the optimistic copy.
        const byClient = new Map(fresh.filter((m) => m.clientId).map((m) => [m.clientId!, m]));
        const kept = prev.filter((m) => !(m.clientId && byClient.has(m.clientId)) && !fresh.some((f) => f.id === m.id));
        const sent = kept.filter((m) => !m.pending && !m.failed);
        const local = kept.filter((m) => m.pending || m.failed);
        return [...sent, ...fresh, ...local];
      });
      markSeen(fresh);
    } catch { /* next tick retries */ }
  }, [target.participantId, target.listingId, loadLatest, markSeen]);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) pollNew(); }, THREAD_POLL_MS);
    const onOnline = () => pollNew();
    window.addEventListener('online', onOnline);
    return () => { clearInterval(t); window.removeEventListener('online', onOnline); };
  }, [pollNew]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const loadOlder = async () => {
    const oldest = serverMessages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const page = await fetchThread(target.participantId, target.listingId || null, { before: oldest.time });
      stickToBottom.current = false;
      setMessages((prev) => [...page.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setThread((t) => (t ? { ...t, hasMore: page.hasMore } : t));
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  const deliver = async (msg: Message) => {
    try {
      const res = await sendMessageApi({ propertyId: target.listingId || undefined, receiverId: target.participantId, text: msg.text, clientId: msg.clientId! });
      const saved: Message = { id: res.message._id, sender: 'me', text: res.message.text, time: res.message.createdAt, read: !!res.message.read, clientId: msg.clientId };
      setMessages((prev) => prev.map((m) => (m.clientId === msg.clientId ? saved : m)));
      if (res.warning === 'contact_info') setWarning(true);
      onChangedRef.current();
    } catch (e) {
      const permanent = e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429;
      setMessages((prev) => prev.map((m) => (m.clientId === msg.clientId ? { ...m, pending: false, failed: true } : m)));
      if (permanent) toast((e as Error).message, 'error');
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: Message = { id: `local-${Date.now()}`, sender: 'me', text, time: new Date().toISOString(), read: false, clientId: newClientId(), pending: true };
    stickToBottom.current = true;
    setMessages((prev) => [...prev, msg]);
    setDraft('');
    deliver(msg);
  };

  const retry = (m: Message) => {
    setMessages((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, pending: true, failed: false } : x)));
    deliver(m); // same clientId: the server stores it at most once
  };
  const discard = (m: Message) => setMessages((prev) => prev.filter((x) => x.clientId !== m.clientId));

  const toggleBlock = async () => {
    if (!thread) return;
    if (!thread.blockedByMe && !window.confirm(`Block ${thread.participant.fullName}? Neither of you will be able to send messages until you unblock.`)) return;
    try {
      if (thread.blockedByMe) await unblockUser(target.participantId);
      else await blockUser(target.participantId);
      setThread({ ...thread, blockedByMe: !thread.blockedByMe });
      toast(thread.blockedByMe ? 'Unblocked' : 'Blocked', 'info');
      onChangedRef.current();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (loading) return <div className="flex flex-1 items-center justify-center text-brand-500"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading conversation" /></div>;
  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm">{loadError || 'Could not load this conversation.'}</p>
        <div className="flex gap-2"><button onClick={onBack} className="btn-outline">Back</button><button onClick={loadLatest} className="btn-primary">Try again</button></div>
      </div>
    );
  }

  const p = thread.participant;
  const property = thread.property || (summary?.listingId ? { id: summary.listingId, title: summary.listingTitle, photo: summary.listingImage } : null);
  const canSend = !p.deleted && !p.suspended && !thread.blockedByMe && !thread.blockedMe;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <button onClick={onBack} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar src={p.avatar || summary?.participantAvatar} name={p.fullName} className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          {p.deleted
            ? <p className="text-sm font-semibold">{p.fullName}</p>
            : <button onClick={() => navigate(`/user/${p.id}`)} className="truncate text-sm font-semibold text-ink-900 hover:underline dark:text-ink-100">{p.fullName}</button>}
          <p className="truncate text-xs text-ink-400">{p.role === 'owner' ? 'Host' : 'Tenant'}</p>
        </div>
        {!p.deleted && (
          <>
            <button onClick={toggleBlock} className="btn-ghost !min-h-0 !px-2 !py-1.5 text-xs" aria-label={thread.blockedByMe ? 'Unblock' : 'Block'}>
              <Ban className="h-4 w-4" /> <span className="hidden sm:inline">{thread.blockedByMe ? 'Unblock' : 'Block'}</span>
            </button>
            <ReportButton targetType="user" targetId={p.id} />
          </>
        )}
      </div>

      {property && (
        <button onClick={() => navigate(`/listing/${property.id}`)} className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-2 text-left dark:border-ink-800 dark:bg-ink-900/50">
          <SafeImage src={property.photo} alt={property.title} width={80} className="h-10 w-14 rounded-lg object-cover" />
          <div className="min-w-0"><p className="truncate text-xs font-semibold">{property.title}</p><p className="text-[10px] text-ink-400">View listing</p></div>
        </button>
      )}

      <div ref={scrollRef} onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-xl space-y-3">
          {thread.hasMore && (
            <div className="text-center">
              <button onClick={loadOlder} disabled={loadingOlder} className="btn-ghost !min-h-0 !py-1.5 text-xs">{loadingOlder ? 'Loading…' : 'Load earlier messages'}</button>
            </div>
          )}
          {messages.length === 0 && <p className="py-8 text-center text-sm text-ink-500">Say hello! Ask about rooms, food, rules and visit times.</p>}
          {messages.map((m) => (
            <div key={m.clientId || m.id} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender === 'me' ? `rounded-br-md bg-brand-500 text-white ${m.failed ? 'opacity-60' : ''}` : 'rounded-bl-md bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100'}`}>
                {/* Rendered as text, never HTML. */}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</p>
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.sender === 'me' ? 'text-white/75' : 'text-ink-400'}`}>
                  {m.pending ? 'Sending…' : formatTime(m.time)}
                  {m.sender === 'me' && !m.pending && !m.failed && (m.read ? <CheckCheck className="h-3 w-3" aria-label="Read" /> : <Check className="h-3 w-3" aria-label="Delivered" />)}
                </div>
              </div>
              {m.failed && (
                <div className="mt-1 flex items-center gap-2 text-xs text-danger">
                  <AlertCircle className="h-3.5 w-3.5" /> Not sent
                  <button onClick={() => retry(m)} className="inline-flex items-center gap-1 font-semibold underline"><RotateCw className="h-3 w-3" /> Retry</button>
                  <button onClick={() => discard(m)} className="inline-flex items-center gap-1 text-ink-500 underline"><X className="h-3 w-3" /> Discard</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800">
        {warning && (
          <div className="mx-auto mb-2 flex max-w-xl items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">Looks like contact details were shared. Keeping the chat on Drisya gives you a record if something goes wrong. Never pay before visiting.</span>
            <button onClick={() => setWarning(false)} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {!canSend ? (
          <p className="text-center text-xs text-ink-500">
            {p.deleted ? 'This person has closed their account.' : thread.blockedByMe ? 'You blocked this person. Unblock to send messages.' : thread.blockedMe || p.suspended ? "You can't message this person." : ''}
          </p>
        ) : (
          <div className="mx-auto flex max-w-xl items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              maxLength={2000}
              placeholder={online ? 'Write a message' : "You're offline — messages will be sent when you retry"}
              className="input max-h-32 flex-1 resize-none"
              aria-label="Message"
            />
            <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </div>
        )}
        <p className="mx-auto mt-2 max-w-xl text-[10px] text-ink-400">Never share OTPs or bank details. Don't pay before visiting.</p>
      </div>
    </>
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
