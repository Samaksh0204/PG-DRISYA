// Location step for the Add/Edit PG form: pin the PG with the phone's GPS or from the
// typed address, check it on a map preview, or type coordinates. Tenants only ever see
// a ~1 km area until a visit is confirmed (enforced by the server).
import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Button, ErrorText, Icon } from './ui';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { addressQuery, coordProblem, isValidCoord, tilesAround } from '../utils/geo';

const ZOOM = 16;
const PREVIEW_H = 180;
// OpenStreetMap's tile policy asks apps to identify themselves.
const TILE_HEADERS = { 'User-Agent': 'PGDrisya-mobile/2.1 (listing location preview)' };

export function LocationPicker({ lat, lng, onChange, city, locality }: {
  lat: string; lng: string; onChange: (lat: string, lng: string) => void; city: string; locality: string;
}) {
  const [busy, setBusy] = useState<'gps' | 'address' | null>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [width, setWidth] = useState(0);

  const latN = Number(lat);
  const lngN = Number(lng);
  const hasPin = !!lat && !!lng && isValidCoord(latN, lngN);
  const problem = coordProblem(lat, lng);

  const set = (a: number, b: number) => onChange(a.toFixed(6), b.toFixed(6));

  const useGps = async () => {
    setBusy('gps');
    setError('');
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(canAskAgain ? 'Location permission is needed to use your current location.' : 'Location is turned off for PG Drisya. Allow it in Settings, or find the PG from its address instead.');
        return;
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((r) => setTimeout(() => r(null), 15000)),
      ]) || await Location.getLastKnownPositionAsync();
      if (!pos) throw new Error('Could not get your location. Move near a window or try again.');
      set(pos.coords.latitude, pos.coords.longitude);
    } catch (e: any) {
      setError(e.message || 'Could not get your location.');
    } finally {
      setBusy(null);
    }
  };

  const fromAddress = async () => {
    if (!city.trim()) return setError('Enter the city (and locality) above first.');
    setBusy('address');
    setError('');
    try {
      const [hit] = await Location.geocodeAsync(addressQuery(locality, city));
      if (!hit) throw new Error("Couldn't find that address. Check the city and locality, or use your current location while at the PG.");
      set(hit.latitude, hit.longitude);
    } catch (e: any) {
      setError(e.message || "Couldn't look up that address.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={styles.help}>Pin where the PG is so tenants can find it on the map. Tenants see only the approximate area (about 1 km) until you confirm their visit.</Text>

      {hasPin ? (
        <View style={styles.preview} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Map preview of the PG location">
          {width > 0 && tilesAround(latN, lngN, ZOOM, width, PREVIEW_H).map((t) => (
            <Image key={t.key} source={{ uri: t.url, headers: TILE_HEADERS }} style={[styles.tile, { left: t.left, top: t.top }]} />
          ))}
          <View pointerEvents="none" style={[styles.pin, { left: width / 2 - 14, top: PREVIEW_H / 2 - 28 }]}>
            <Icon name="location" size={28} color={colors.danger} />
          </View>
          <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
        </View>
      ) : (
        <View style={[styles.preview, styles.empty]}>
          <Icon name="map-outline" size={28} color={colors.brand[300]} />
          <Text style={styles.emptyText}>No location yet</Text>
        </View>
      )}

      <View style={styles.row}>
        <Button variant="outline" icon="locate-outline" title={busy === 'gps' ? 'Locating…' : 'Use my location'} onPress={useGps} disabled={!!busy} style={styles.half} />
        <Button variant="outline" icon="search-outline" title={busy === 'address' ? 'Searching…' : 'From address'} onPress={fromAddress} disabled={!!busy} style={styles.half} />
      </View>
      {busy ? <ActivityIndicator color={colors.brand[500]} style={{ marginTop: spacing.sm }} /> : null}
      <ErrorText>{error}</ErrorText>

      {hasPin && (
        <View style={styles.coords}>
          <Text style={styles.coordText}>{latN.toFixed(5)}, {lngN.toFixed(5)}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latN},${lngN}`)} hitSlop={6}>
            <Text style={styles.link}>Check in Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onChange('', '')} hitSlop={6}>
            <Text style={[styles.link, { color: colors.red[700] }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={() => setManual((v) => !v)} style={{ marginTop: spacing.sm }} accessibilityRole="button">
        <Text style={styles.link}>{manual ? 'Hide coordinates' : 'Enter coordinates manually'}</Text>
      </TouchableOpacity>
      {manual && (
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <TextInput style={[styles.input, styles.half]} value={lat} onChangeText={(v) => onChange(v, lng)} placeholder="Latitude, e.g. 22.7533" placeholderTextColor={colors.ink[400]} keyboardType="numbers-and-punctuation" accessibilityLabel="Latitude" />
          <TextInput style={[styles.input, styles.half]} value={lng} onChangeText={(v) => onChange(lat, v)} placeholder="Longitude, e.g. 75.8937" placeholderTextColor={colors.ink[400]} keyboardType="numbers-and-punctuation" accessibilityLabel="Longitude" />
        </View>
      )}
      {problem ? <ErrorText>{problem}</ErrorText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: colors.ink[500], lineHeight: 18, marginBottom: spacing.sm },
  preview: { height: PREVIEW_H, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink[100], borderWidth: 1, borderColor: colors.ink[200] },
  tile: { position: 'absolute', width: 256, height: 256 },
  pin: { position: 'absolute' },
  attribution: { position: 'absolute', right: 4, bottom: 2, fontSize: 9, color: colors.ink[600], backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6, borderStyle: 'dashed' },
  emptyText: { fontSize: 13, color: colors.ink[500] },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  half: { flex: 1 },
  coords: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
  coordText: { fontSize: 13, fontWeight: '600', color: colors.ink[700] },
  link: { fontSize: 13, fontWeight: '700', color: colors.brand[700] },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 14, color: colors.ink[900], backgroundColor: colors.white },
});
