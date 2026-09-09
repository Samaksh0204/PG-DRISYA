import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

export function EditProfileScreen() {
  const nav = useNavigation();
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setLoading(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim(), city: city.trim(), bio: bio.trim(), gender });
      await refreshUser();
      Alert.alert('Success', 'Profile updated');
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Edit Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.ink[400]} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="9876543210" placeholderTextColor={colors.ink[400]} keyboardType="phone-pad" />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Pune" placeholderTextColor={colors.ink[400]} />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {['male', 'female', 'other'].map((g) => (
            <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
              <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio}
          placeholder="Tell us about yourself..." placeholderTextColor={colors.ink[400]} multiline />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing['2xl'], paddingTop: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink[900], backgroundColor: colors.ink[50],
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderBtn: { flex: 1, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.ink[50] },
  genderBtnActive: { borderColor: colors.coral[500], backgroundColor: colors.coral[50] },
  genderBtnText: { fontSize: 14, color: colors.ink[600], fontWeight: '500' },
  genderBtnTextActive: { color: colors.coral[600], fontWeight: '700' },
  saveBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing['2xl'] },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
