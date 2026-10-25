import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Conversation, RootStackParamList } from '../types';
import { fetchConversations, markRead, sendMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Button, Empty, Icon } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const POLL_MS = 15000;

const timeLabel = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function InboxScreen() {
  const nav = useNavigation<Nav>();
  const { user, refreshCounts } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) return setLoading(false);
    try { setItems(await fetchConversations()); refreshCounts(); } catch { /* keep */ }
    setLoading(false);
  }, [user, refreshCounts]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return <View style={s.center}><Empty icon="chatbubbles-outline" title="Sign in to see your messages" desc="Chat with owners about rooms, food, rules and visit times."><Button title="Sign in" onPress={() => nav.navigate('Login')} /></Empty></View>;
  }
  return (
    <FlatList
      style={{ backgroundColor: colors.white }}
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
      ListEmptyComponent={loading ? undefined : <Empty icon="chatbubbles-outline" title="No messages yet" desc="Message an owner from any listing to ask questions before you visit." />}
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
            <Text style={[s.preview, item.unread > 0 && { color: colors.ink[900], fontWeight: '600' }]} numberOfLines={1}>{item.lastMessage}</Text>
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
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList>(null);

  const id = params.conversationId || `${params.propertyId || 'none'}-${params.participantId}`;
  const load = useCallback(async () => {
    try {
      const all = await fetchConversations();
      const c = all.find((x) => x.id === id) || null;
      setConvo(c);
      if (c && c.unread > 0) markRead(c.propertyId, c.participantId).then(refreshCounts).catch(() => {});
    } catch { /* keep */ }
  }, [id, refreshCounts]);

  useEffect(() => {
    nav.setOptions({ title: params.participantName });
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, nav, params.participantName]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await sendMessage({ receiverId: params.participantId, propertyId: params.propertyId, text });
      setDraft('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {params.propertyTitle ? (
        <TouchableOpacity style={s.contextRow} disabled={!params.propertyId} onPress={() => params.propertyId && nav.navigate('ListingDetail', { id: params.propertyId })}>
          <Icon name="business-outline" size={14} color={colors.brand[700]} />
          <Text style={s.context} numberOfLines={1}>About: {params.propertyTitle}</Text>
          {params.propertyId ? <Icon name="chevron-forward" size={14} color={colors.ink[400]} /> : null}
        </TouchableOpacity>
      ) : null}
      <FlatList
        ref={listRef}
        data={convo?.messages || []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.hint}>Say hello! Ask about rooms, food, rules and visit times.</Text>}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.sender === 'me' ? s.mine : s.theirs]}>
            <Text style={{ color: item.sender === 'me' ? colors.white : colors.ink[900], fontSize: 15 }}>{item.text}</Text>
            <Text style={[s.bubbleTime, { color: item.sender === 'me' ? 'rgba(255,255,255,0.75)' : colors.ink[400] }]}>{timeLabel(item.time)}{item.sender === 'me' ? (item.read ? ' ✓✓' : ' ✓') : ''}</Text>
          </View>
        )}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      {convo?.participantDeleted ? (
        <Text style={s.hint}>This person has closed their account.</Text>
      ) : (
        <View style={s.inputRow}>
          <TextInput accessibilityLabel="Message" style={s.input} value={draft} onChangeText={setDraft} placeholder="Write a message" placeholderTextColor={colors.ink[400]} maxLength={2000} multiline />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!draft.trim() || sending} style={[s.send, (!draft.trim() || sending) && { opacity: 0.5 }]}>
            <Icon name="send" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
      <View style={s.footerLinks}>
        <TouchableOpacity onPress={() => nav.navigate('HostProfile', { id: params.participantId, name: params.participantName })} hitSlop={6}>
          <Text style={s.footerLink}>View profile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nav.navigate('Report', { targetType: 'user', targetId: params.participantId, label: params.participantName })} hitSlop={6}>
          <Text style={s.footerLink}>Report this person</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: spacing['2xl'], backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.ink[100], gap: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink[100] },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink[900], flex: 1 },
  time: { fontSize: 11, color: colors.ink[400] },
  sub: { fontSize: 12, color: colors.ink[400] },
  preview: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  badge: { backgroundColor: colors.brand[500], borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  contextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, backgroundColor: colors.brand[50], borderBottomWidth: 1, borderBottomColor: colors.brand[100] },
  context: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.brand[800] },
  propThumb: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingVertical: 8 },
  footerLink: { fontSize: 12, color: colors.ink[500] },
  hint: { textAlign: 'center', color: colors.ink[500], padding: spacing.lg },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: spacing.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand[500], borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderBottomLeftRadius: 4 },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  error: { color: colors.red[700], paddingHorizontal: spacing.lg, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.ink[100], gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 120, fontSize: 15, color: colors.ink[900] },
  send: { backgroundColor: colors.brand[500], borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
