import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadImages } from '../services/api';
import { prepareForUpload } from '../utils/images';
import { Avatar, Button, Chip, ErrorText, Field, Icon } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

export function EditProfileScreen() {
  const nav = useNavigation();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    city: user?.city || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    college: user?.college || '',
    preferredLocality: user?.preferredLocality || '',
    budgetMin: user?.budgetMin ? String(user.budgetMin) : '',
    budgetMax: user?.budgetMax ? String(user.budgetMax) : '',
  });
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!user) return null;
  const isHost = user.role === 'owner' || user.role === 'admin';

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets.length) return;
    const a = result.assets[0];
    setUploading(true);
    try {
      const [url] = await uploadImages(await prepareForUpload([a]));
      setAvatar(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return setError('Name is required');
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) return setError('Please enter a 10-digit phone number');
    const min = form.budgetMin ? Number(form.budgetMin) : 0;
    const max = form.budgetMax ? Number(form.budgetMax) : 0;
    if (min && max && min > max) return setError('Minimum budget is higher than maximum');
    setSaving(true);
    setError('');
    try {
      const { user: updated } = await updateProfile({
        fullName: form.fullName.trim(), phone: form.phone.trim(), city: form.city.trim(), gender: form.gender, bio: form.bio.trim(),
        college: form.college.trim(), preferredLocality: form.preferredLocality.trim(), budgetMin: min, budgetMax: max, avatar,
      });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
      nav.goBack();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={uploading}>
          <Avatar uri={avatar} name={form.fullName || user.fullName} size={96} />
          <View style={styles.camera}>{uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="create-outline" size={16} color={colors.white} />}</View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>

        <View style={styles.card}>
          <Text style={styles.h}>About you</Text>
          <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} autoComplete="name" />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" hint="Shared only after a visit is confirmed or a booking accepted." />
          <Field label="City" value={form.city} onChangeText={set('city')} placeholder="e.g. Indore" />
          <Text style={styles.label}>Gender</Text>
          <View style={styles.wrap}>
            {[['male', 'Male'], ['female', 'Female'], ['other', 'Other']].map(([v, l]) => <Chip key={v} label={l} active={form.gender === v} onPress={() => set('gender')(form.gender === v ? '' : v)} />)}
          </View>
          <Field label="Bio" value={form.bio} onChangeText={set('bio')} multiline maxLength={500} placeholder={isHost ? 'Tell tenants about you and how you run your PG' : 'A line about you helps hosts say yes'} />
        </View>

        {!isHost || user.role === 'admin' ? (
          <View style={styles.card}>
            <Text style={styles.h}>What you're looking for</Text>
            <Field label="College / workplace" value={form.college} onChangeText={set('college')} />
            <Field label="Preferred area" value={form.preferredLocality} onChangeText={set('preferredLocality')} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}><Field label="Budget from (₹)" value={form.budgetMin} onChangeText={set('budgetMin')} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Budget to (₹)" value={form.budgetMax} onChangeText={set('budgetMax')} keyboardType="number-pad" /></View>
            </View>
          </View>
        ) : null}

        <ErrorText>{error}</ErrorText>
        <Button title="Save changes" onPress={handleSave} loading={saving} disabled={uploading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  scroll: { padding: spacing.lg, paddingBottom: 48 },
  avatarWrap: { alignSelf: 'center', marginTop: spacing.sm },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand[500], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  avatarHint: { textAlign: 'center', fontSize: 12, color: colors.ink[500], marginTop: 6, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  h: { fontSize: 16, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
});
