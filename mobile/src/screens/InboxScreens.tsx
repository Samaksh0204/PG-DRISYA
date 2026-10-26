import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, FlatList, Image, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage, Conversation, RootStackParamList, ThreadPage } from '../types';
import { ApiError, blockUser, fetchConversations, fetchThread, markRead, newClientId, sendMessage, unblockUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Button, Empty, ErrorText, Icon } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const LIST_POLL_MS = 15000;
const THREAD_POLL_MS = 5000;

const timeLabel = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Runs `fn` every `ms` while this screen is focused and the app is in the foreground.
function useForegroundPolling(fn: () => void, ms: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = setInterval(() => fnRef.current(), ms);
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          fnRef.current();
          if (!timer) timer = setInterval(() => fnRef.current(), ms);
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      return () => {
        if (timer) clearInterval(timer);
        sub.remove();
      };
    }, [ms]),
  );
}

const isOffline = (e: unknown) => e instanceof ApiError && e.status === 0;

export function InboxScreen() {
  const nav = useNavigation<Nav>();
  const { user, refreshCounts } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return setLoading(false);
    try {
      setItems(await fetchConversations());
      setError('');
      refreshCounts();
    } catch (e: any) {
      setError(isOffline(e) ? "You're offline. Pull to refresh when you're back online." : e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, refreshCounts]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useForegroundPolling(load, LIST_POLL_MS);

  if (!user) {
    return <View style={s.center}><Empty icon="chatbubbles-outline" title="Sign in to see your messages" desc="Chat with owners about rooms, food, rules and visit times."><Button title="Sign in" onPress={() => nav.navigate('Login')} /></Empty></View>;
  }
  if (loading) return <View style={s.center}><ActivityIndicator color={colors.brand[500]} size="large" /></View>;
  return (
    <FlatList
      style={{ backgroundColor: colors.white }}
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ flexGrow: 1 }}
      ListHeaderComponent={error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorText>{error}</ErrorText></View> : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
      ListEmptyComponent={<Empty icon="chatbubbles-outline" title="No messages yet" desc="Message an owner from any listing to ask questions before you visit." />}
      renderItem={({ item }) => (
        <TouchableOpacity style={s.row} onPress={() => nav.navigate('Chat', { conversationId: item.id, participantId: item.participantId, participantName: item.participantName, propertyId: item.propertyId, propertyTitle: item.propertyTitle })}>
          <View>
            <Avatar uri={item.participantAvatar} name={item.participantName} size={48} />
            {item.propertyImage ? <Image source={{ uri: item.propertyImage }} style={s.propThumb} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.rowTop}>
              <Text style={[s.name, item.unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>{item.participantName}</Text>
              <Text style={s.time}>{timeLabel(item.lastMessageTime)}</Text>
            </View>
            <Text style={s.sub} numberOfLines={1}>{item.participantRole === 'owner' ? 'Host · ' : ''}{item.propertyTitle}</Text>
            <Text style={[s.preview, item.unread > 0 && { color: colors.ink[900], fontWeight: '600' }]} numberOfLines={1}>{item.blockedByMe ? 'Blocked' : item.lastMessage}</Text>
          </View>
          {item.unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{item.unread}</Text></View>}
        </TouchableOpacity>
      )}
    />
  );
}

export function ChatScreen() {
  const nav = useNavigation<Nav>();
  const { refreshCounts } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [thread, setThread] = useState<Omit<ThreadPage, 'messages'> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [offline, setOffline] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [warning, setWarning] = useState(false);
  const lastServerTime = useRef<string | null>(null);

  const serverMessages = useMemo(() => messages.filter((m) => !m.pending && !m.failed), [messages]);
  useEffect(() => { lastServerTime.current = serverMessages[serverMessages.length - 1]?.time || null; }, [serverMessages]);

  const markSeen = useCallback((msgs: ChatMessage[]) => {
    if (msgs.some((m) => m.sender === 'them' && !m.read)) markRead(params.propertyId || null, params.participantId).then(refreshCounts).catch(() => {});
  }, [params.propertyId, params.participantId, refreshCounts]);

  const loadLatest = useCallback(async () => {
    try {
      const { messages: msgs, ...rest } = await fetchThread(params.participantId, params.propertyId);
      setThread(rest);
      // Keep messages still sending (or failed) from this device.
      setMessages((prev) => [...msgs, ...prev.filter((m) => (m.pending || m.failed) && !msgs.some((x) => x.clientId && x.clientId === m.clientId))]);
      setLoadError('');
      setOffline(false);
      markSeen(msgs);
    } catch (e: any) {
      setOffline(isOffline(e));
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.participantId, params.propertyId, markSeen]);

  useEffect(() => {
    nav.setOptions({ title: params.participantName });
    loadLatest();
  }, [loadLatest, nav, params.participantName]);

  // New messages from the other person — or from this account on the website.
  const pollNew = useCallback(async () => {
    if (!lastServerTime.current) return loadLatest();
    try {
      const { messages: fresh, ...rest } = await fetchThread(params.participantId, params.propertyId, { after: lastServerTime.current });
      setThread(rest);
      setOffline(false);
      if (!fresh.length) return;
      setMessages((prev) => {
        const kept = prev.filter((m) => !fresh.some((f) => f.id === m.id || (f.clientId && f.clientId === m.clientId)));
        return [...kept.filter((m) => !m.pending && !m.failed), ...fresh, ...kept.filter((m) => m.pending || m.failed)];
      });
      markSeen(fresh);
    } catch (e) {
      setOffline(isOffline(e));
    }
  }, [params.participantId, params.propertyId, loadLatest, markSeen]);
  useForegroundPolling(pollNew, THREAD_POLL_MS);

  const loadOlder = async () => {
    const oldest = serverMessages[0];
    if (!thread?.hasMore || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchThread(params.participantId, params.propertyId, { before: oldest.time });
      setMessages((prev) => [...page.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setThread((t) => (t ? { ...t, hasMore: page.hasMore } : t));
    } catch { /* user can scroll again to retry */ }
    setLoadingOlder(false);
  };

  const deliver = async (msg: ChatMessage) => {
    try {
      const res = await sendMessage({ receiverId: params.participantId, propertyId: params.propertyId, text: msg.text, clientId: msg.clientId! });
      const saved: ChatMessage = { id: res.message._id, sender: 'me', text: res.message.text, time: res.message.createdAt, read: !!res.message.read, clientId: msg.clientId };
      setMessages((prev) => prev.map((m) => (m.clientId === msg.clientId ? saved : m)));
      if (res.warning === 'contact_info') setWarning(true);
      setOffline(false);
    } catch (e: any) {
      setMessages((prev) => prev.map((m) => (m.clientId === msg.clientId ? { ...m, pending: false, failed: true } : m)));
      if (isOffline(e)) setOffline(true);
      else if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) Alert.alert('Message not sent', e.message);
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: ChatMessage = { id: `local-${Date.now()}`, sender: 'me', text, time: new Date().toISOString(), read: false, clientId: newClientId(), pending: true };
    setMessages((prev) => [...prev, msg]);
    setDraft('');
    deliver(msg);
  };

  const onFailedPress = (m: ChatMessage) => Alert.alert('Message not sent', m.text.slice(0, 120), [
    { text: 'Discard', style: 'destructive', onPress: () => setMessages((prev) => prev.filter((x) => x.clientId !== m.clientId)) },
    { text: 'Cancel', style: 'cancel' },
    // Same clientId: the server stores it at most once even if the first try actually arrived.
    { text: 'Retry', onPress: () => { setMessages((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, pending: true, failed: false } : x))); deliver(m); } },
  ]);

  const toggleBlock = () => {
    if (!thread) return;
    const doIt = async () => {
      try {
        if (thread.blockedByMe) await unblockUser(params.participantId); else await blockUser(params.participantId);
        setThread({ ...thread, blockedByMe: !thread.blockedByMe });
      } catch (e: any) {
        Alert.alert('Could not update', e.message);
      }
    };
    if (thread.blockedByMe) return doIt();
    Alert.alert(`Block ${params.participantName}?`, 'Neither of you will be able to send messages until you unblock.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: doIt },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.brand[500]} size="large" /></View>;
  if (!thread) {
    return (
      <View style={s.center}>
        <Empty icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'} title={offline ? "You're offline" : 'Could not load this chat'} desc={loadError}>
          <Button icon="reload" title="Try again" onPress={() => { setLoading(true); loadLatest(); }} />
        </Empty>
      </View>
    );
  }

  const p = thread.participant;
  const canSend = !p.deleted && !p.suspended && !thread.blockedByMe && !thread.blockedMe;
  // Inverted list: newest at the bottom, scrolling up loads older pages.
  const data = [...messages].reverse();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      {offline && (
        <View style={s.offline} accessibilityRole="alert"><Icon name="cloud-offline-outline" size={16} color={colors.amber[700]} /><Text style={s.offlineText}>You're offline. Messages will sync when you reconnect.</Text></View>
      )}
      {params.propertyTitle || thread.property ? (
        <TouchableOpacity style={s.contextRow} disabled={!params.propertyId} onPress={() => params.propertyId && nav.navigate('ListingDetail', { id: params.propertyId })}>
          <Icon name="business-outline" size={14} color={colors.brand[700]} />
          <Text style={s.context} numberOfLines={1}>About: {thread.property?.title || params.propertyTitle}</Text>
          {params.propertyId ? <Icon name="chevron-forward" size={14} color={colors.ink[400]} /> : null}
        </TouchableOpacity>
      ) : null}
      {data.length === 0 ? (
        // Outside the inverted list: Android flips inverted lists both ways, which
        // mirrored this text when it was the list's empty component.
        <View style={s.emptyChat}><Icon name="chatbubbles-outline" size={28} color={colors.brand[300]} /><Text style={s.hint}>Say hello! Ask about rooms, food, rules and visit times.</Text></View>
      ) : (
      <FlatList
        inverted
        data={data}
        keyExtractor={(m) => m.clientId || m.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.brand[500]} style={{ marginVertical: spacing.md }} /> : undefined}
        renderItem={({ item }) => {
          const mine = item.sender === 'me';
          return (
            <TouchableOpacity activeOpacity={item.failed ? 0.7 : 1} disabled={!item.failed} onPress={() => onFailedPress(item)} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: spacing.sm }}>
              <View style={[s.bubble, mine ? s.mine : s.theirs, item.failed && { opacity: 0.6 }]}>
                <Text style={{ color: mine ? colors.white : colors.ink[900], fontSize: 15 }}>{item.text}</Text>
                <Text style={[s.bubbleTime, { color: mine ? 'rgba(255,255,255,0.8)' : colors.ink[400] }]}>
                  {item.pending ? 'Sending…' : timeLabel(item.time)}{mine && !item.pending && !item.failed ? (item.read ? ' ✓✓' : ' ✓') : ''}
                </Text>
              </View>
              {item.failed && <Text style={s.failed}>Not sent · tap to retry</Text>}
            </TouchableOpacity>
          );
        }}
      />
      )}
      {!p.deleted && (
        <View style={s.footerLinks}>
          <TouchableOpacity onPress={() => nav.navigate('HostProfile', { id: params.participantId, name: params.participantName })} hitSlop={8}><Text style={s.footerLink}>View profile</Text></TouchableOpacity>
          <TouchableOpacity onPress={toggleBlock} hitSlop={8}><Text style={s.footerLink}>{thread.blockedByMe ? 'Unblock' : 'Block'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Report', { targetType: 'user', targetId: params.participantId, label: params.participantName })} hitSlop={8}><Text style={s.footerLink}>Report</Text></TouchableOpacity>
        </View>
      )}
      {warning && (
        <View style={s.warning}>
          <Icon name="shield-checkmark-outline" size={16} color={colors.amber[700]} />
          <Text style={s.warningText}>Looks like contact details were shared. Keeping the chat on Drisya gives you a record. Never pay before visiting.</Text>
          <TouchableOpacity onPress={() => setWarning(false)} accessibilityLabel="Dismiss" hitSlop={8}><Icon name="close" size={16} color={colors.amber[700]} /></TouchableOpacity>
        </View>
      )}
      {canSend ? (
        <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput accessibilityLabel="Message" style={s.input} value={draft} onChangeText={setDraft} placeholder="Write a message" placeholderTextColor={colors.ink[400]} maxLength={2000} multiline />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!draft.trim()} style={[s.send, !draft.trim() && { opacity: 0.5 }]}>
            <Icon name="send" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[s.hint, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {p.deleted ? 'This person has closed their account.' : thread.blockedByMe ? 'You blocked this person. Unblock to send messages.' : "You can't message this person."}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: spacing['2xl'], backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.ink[100], gap: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink[900], flex: 1 },
  time: { fontSize: 11, color: colors.ink[400] },
  sub: { fontSize: 12, color: colors.ink[400] },
  preview: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  badge: { backgroundColor: colors.brand[500], borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  propThumb: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  contextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, backgroundColor: colors.brand[50], borderBottomWidth: 1, borderBottomColor: colors.brand[100] },
  context: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.brand[800] },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.amber[50], paddingHorizontal: spacing.lg, paddingVertical: 8 },
  offlineText: { flex: 1, fontSize: 12, color: colors.amber[700] },
  hint: { textAlign: 'center', color: colors.ink[500], padding: spacing.lg },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.brand[500], borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderBottomLeftRadius: 4 },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  failed: { fontSize: 11, color: colors.red[700], marginTop: 2, fontWeight: '600' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.amber[50], marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  warningText: { flex: 1, fontSize: 12, color: colors.amber[700], lineHeight: 17 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.ink[200], gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 120, minHeight: 44, fontSize: 15, color: colors.ink[900] },
  send: { backgroundColor: colors.brand[500], borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingVertical: 6, backgroundColor: colors.page },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  footerLink: { fontSize: 12, color: colors.ink[500], paddingVertical: 4 },
});
