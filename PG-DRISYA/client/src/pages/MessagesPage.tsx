import { useEffect, useState } from 'react';
import { Search, Send, ShieldCheck, Phone, MoreVertical, ArrowLeft, Check, CheckCheck, LogIn, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchConversations, sendMessage as sendMessageApi, markRead } from '../lib/api';
import type { Conversation } from '../types';

export function MessagesPage() {
  const { navigate, auth, authLoading } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    fetchConversations()
      .then((convos) => { setConversations(convos); setLoading(false); })
      .catch(() => setLoading(false));
  }, [auth?.id]);

  const active = conversations.find((c) => c.id === activeId) || null;

  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(search.toLowerCase()) ||
      c.listingTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (convo: Conversation) => {
    setActiveId(convo.id);
    setDraft('');
    if (convo.unread > 0 && auth) {
      markRead(convo.listingId, convo.participantId).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, unread: 0 } : c)),
      );
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !active || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');

    const tempMsg = {
      id: `temp-${Date.now()}`,
      sender: 'me' as const,
      text,
      time: new Date().toISOString(),
      read: false,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, tempMsg], lastMessage: text, lastMessageTime: tempMsg.time }
          : c,
      ),
    );

    try {
      await sendMessageApi({
        propertyId: active.listingId,
        receiverId: active.participantId,
        text,
      });
    } catch {
      // Optimistic update stays; a production app would show an error toast
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  if (!authLoading && !auth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <MessageCircle className="h-12 w-12 text-ink-300" />
        <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-100">Sign in required</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Log in to view and send messages.</p>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">
          <LogIn className="h-4 w-4" /> Log in
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-page py-20">
        <div className="skeleton mb-4 h-12 w-64 rounded-full" />
        <div className="grid grid-cols-3 gap-4">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="col-span-2 skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/30 dark:bg-ink-950">
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white">{totalUnread}</span>
            )}
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Chat with owners and tenants about properties</p>
        </div>

        <div className="card flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
          {/* Conversation list */}
          <div className={`flex w-full flex-col border-r border-ink-100 dark:border-ink-800 md:w-80 lg:w-96 ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="border-b border-ink-100 p-3 dark:border-ink-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="input w-full pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`flex w-full items-center gap-3 border-b border-ink-50 px-4 py-3 text-left transition dark:border-ink-800/50 ${
                      activeId === c.id
                        ? 'bg-coral-50/50 dark:bg-coral-900/10'
                        : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={c.participantAvatar}
                        alt={c.participantName}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      {c.unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`truncate text-sm ${c.unread > 0 ? 'font-bold text-ink-900 dark:text-ink-100' : 'font-medium text-ink-700 dark:text-ink-200'}`}>
                          {c.participantName}
                        </span>
                        <span className="flex-shrink-0 text-[10px] text-ink-400">{formatTime(c.lastMessageTime)}</span>
                      </div>
                      <p className="truncate text-xs text-ink-400">{c.listingTitle}</p>
                      <p className={`mt-0.5 truncate text-xs ${c.unread > 0 ? 'font-semibold text-ink-700 dark:text-ink-200' : 'text-ink-500 dark:text-ink-400'}`}>
                        {c.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="h-10 w-10 text-ink-300" />
                  <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">No conversations</p>
                  <p className="mt-1 text-xs text-ink-400">Start a conversation from any listing page</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat view */}
          <div className={`flex flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
            {active ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                  <button onClick={() => setActiveId(null)} className="md:hidden rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <img src={active.participantAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{active.participantName}</p>
                      {active.participantRole === 'owner' && <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />}
                    </div>
                    <p
                      className="cursor-pointer truncate text-xs text-ink-400 hover:text-coral-500"
                      onClick={() => active.listingId && navigate(`/listing/${active.listingId}`)}
                    >
                      {active.listingTitle}
                    </p>
                  </div>
                  <button className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                {/* Property context bar */}
                {active.listingImage && (
                  <div
                    className="flex cursor-pointer items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-2 dark:border-ink-800 dark:bg-ink-900/50"
                    onClick={() => navigate(`/listing/${active.listingId}`)}
                  >
                    <img src={active.listingImage} alt="" className="h-10 w-14 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-700 dark:text-ink-200">{active.listingTitle}</p>
                      <p className="text-[10px] text-ink-400">Tap to view listing</p>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="mx-auto max-w-xl space-y-3">
                    {active.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.sender === 'me'
                              ? 'rounded-br-md bg-coral-500 text-white'
                              : 'rounded-bl-md bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${msg.sender === 'me' ? 'text-white/70' : 'text-ink-400'}`}>
                            <span>{formatTime(msg.time)}</span>
                            {msg.sender === 'me' && (
                              msg.read
                                ? <CheckCheck className="h-3 w-3 text-white/90" />
                                : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800">
                  <div className="mx-auto flex max-w-xl items-center gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Type a message..."
                      className="input flex-1"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!draft.trim() || sending}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-coral-500 text-white transition hover:bg-coral-600 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <MessageCircle className="h-12 w-12 text-ink-300" />
                <h3 className="mt-3 text-base font-semibold text-ink-900 dark:text-ink-100">Select a conversation</h3>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose a conversation from the left to start messaging</p>
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
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
