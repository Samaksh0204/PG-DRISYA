import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { createListing, updateListing, fetchListingDetail, uploadImages } from '../services/api';
import { AMENITY_MAP } from '../data/amenities';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'AddListing'>['route'];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
  { value: 'coed', label: 'Co-ed' },
];

const OCCUPANCY_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' },
  { value: 'dorm', label: 'Dorm' },
];

export function AddListingScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProps>();
  const editId = route.params?.editId;
  const isEdit = !!editId;

  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState('coed');
  const [occupancy, setOccupancy] = useState('double');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  useEffect(() => {
    if (editId) {
      (async () => {
        try {
          const detail = await fetchListingDetail(editId);
          if (detail) {
            const p = detail.property;
            setTitle(p.title);
            setCity(p.city);
            setLocality(p.locality);
            setPrice(String(p.price));
            setDeposit(String(p.deposit));
            setDescription(p.description);
            setGender(p.genderPreference);
            setOccupancy(p.occupancy);
            setAmenities(p.amenities);
            setPhotos(p.photos);
          }
        } catch {} finally {
          setInitialLoading(false);
        }
      })();
    }
  }, [editId]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      try {
        const files = result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
        }));
        const urls = await uploadImages(files);
        setPhotos((prev) => [...prev, ...urls]);
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (key: string) => {
    setAmenities((prev) => prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !city.trim() || !price) {
      Alert.alert('Error', 'Title, city, and price are required');
      return;
    }
    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        city: city.trim(),
        locality: locality.trim(),
        price: Number(price),
        deposit: Number(deposit) || 0,
        description: description.trim(),
        genderPreference: gender,
        occupancy,
        amenities,
        photos,
      };
      if (isEdit) {
        await updateListing(editId!, data);
        Alert.alert('Success', 'Listing updated');
      } else {
        await createListing(data);
        Alert.alert('Success', 'Listing created');
      }
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.coral[500]} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{isEdit ? 'Edit Listing' : 'Add New PG'}</Text>

        {/* Photos */}
        <Text style={styles.sectionTitle}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.coral[500]} /> : <Text style={styles.addPhotoText}>+ Add</Text>}
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Sunshine Girls PG" placeholderTextColor={colors.ink[400]} />

        <Text style={styles.label}>City *</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Pune" placeholderTextColor={colors.ink[400]} />

        <Text style={styles.label}>Locality</Text>
        <TextInput style={styles.input} value={locality} onChangeText={setLocality} placeholder="e.g. Kothrud" placeholderTextColor={colors.ink[400]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price/month *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="8500" placeholderTextColor={colors.ink[400]} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Deposit</Text>
            <TextInput style={styles.input} value={deposit} onChangeText={setDeposit} placeholder="15000" placeholderTextColor={colors.ink[400]} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Describe your PG..." placeholderTextColor={colors.ink[400]} multiline />

        {/* Gender */}
        <Text style={styles.sectionTitle}>Gender Preference</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.chip, gender === opt.value && styles.chipActive]} onPress={() => setGender(opt.value)}>
              <Text style={[styles.chipText, gender === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Occupancy */}
        <Text style={styles.sectionTitle}>Room Type</Text>
        <View style={styles.chipRow}>
          {OCCUPANCY_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.chip, occupancy === opt.value && styles.chipActive]} onPress={() => setOccupancy(opt.value)}>
              <Text style={[styles.chipText, occupancy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amenities */}
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenityGrid}>
          {Object.entries(AMENITY_MAP).map(([key, val]) => (
            <TouchableOpacity key={key} style={[styles.amenityChip, amenities.includes(key) && styles.amenityChipActive]} onPress={() => toggleAmenity(key)}>
              <Text style={styles.amenityIcon}>{val.icon}</Text>
              <Text style={[styles.amenityLabel, amenities.includes(key) && { color: colors.coral[600] }]}>{val.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>{isEdit ? 'Update Listing' : 'Create Listing'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing['2xl'], paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.lg },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: spacing.xl, marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink[900], backgroundColor: colors.ink[50],
  },
  row: { flexDirection: 'row', gap: spacing.md },

  photoScroll: { marginBottom: spacing.sm },
  photoWrap: { marginRight: spacing.sm, position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: radius.lg },
  photoRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.red[500], borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  photoRemoveText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  addPhotoBtn: { width: 80, height: 80, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.ink[200], borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { color: colors.ink[400], fontWeight: '600' },

  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.ink[50] },
  chipActive: { borderColor: colors.coral[500], backgroundColor: colors.coral[50] },
  chipText: { fontSize: 13, color: colors.ink[600], fontWeight: '500' },
  chipTextActive: { color: colors.coral[600], fontWeight: '700' },

  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.ink[50] },
  amenityChipActive: { borderColor: colors.coral[500], backgroundColor: colors.coral[50] },
  amenityIcon: { fontSize: 14 },
  amenityLabel: { fontSize: 12, color: colors.ink[600] },

  submitBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing['2xl'] },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
