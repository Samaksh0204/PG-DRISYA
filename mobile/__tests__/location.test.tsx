import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { toWorldPixel, tilesAround, coordProblem, addressQuery } from '../src/utils/geo';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

import { LocationPicker } from '../src/components/LocationPicker';
const mockLocation = jest.requireMock('expo-location');

describe('geo helpers', () => {
  test('Web Mercator pixel matches an independent calculation (Indore, zoom 16)', () => {
    const p = toWorldPixel(22.7196, 75.8577, 16);
    expect(p.x).toBeCloseTo(11923833.1, 0);
    expect(p.y).toBeCloseTo(7300907.3, 0);
  });
  test('tiles cover the preview box and the pin tile is included', () => {
    const tiles = tilesAround(22.7196, 75.8577, 16, 340, 180);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles.some((t) => t.url === 'https://tile.openstreetmap.org/16/46577/28519.png')).toBe(true);
    for (const t of tiles) {
      expect(t.left).toBeLessThan(340);
      expect(t.left + 256).toBeGreaterThan(0);
    }
  });
  test('coordinate validation', () => {
    expect(coordProblem('', '')).toBeNull();
    expect(coordProblem('22.7', '')).toMatch(/both/);
    expect(coordProblem('95', '75')).toMatch(/between/);
    expect(coordProblem('22.7196', '75.8577')).toBeNull();
    expect(addressQuery(' Vijay Nagar ', 'Indore')).toBe('Vijay Nagar, Indore, India');
  });
});

describe('LocationPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  async function setup(props: Partial<React.ComponentProps<typeof LocationPicker>> = {}) {
    const onChange = jest.fn();
    await render(<LocationPicker lat="" lng="" onChange={onChange} city="Indore" locality="Vijay Nagar" {...props} />);
    return onChange;
  }

  test('uses the phone location after permission is granted', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 22.7533123, longitude: 75.8937456 } });
    const onChange = await setup();
    await fireEvent.press(screen.getByLabelText(/Use my location/));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('22.753312', '75.893746'));
  });

  test('explains what to do when location permission is refused', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });
    const onChange = await setup();
    await fireEvent.press(screen.getByLabelText(/Use my location/));
    expect(await screen.findByText(/Allow it in Settings/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('finds the PG from the typed address', async () => {
    mockLocation.geocodeAsync.mockResolvedValue([{ latitude: 22.75, longitude: 75.89 }]);
    const onChange = await setup();
    await fireEvent.press(screen.getByLabelText(/From address/));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('22.750000', '75.890000'));
    expect(mockLocation.geocodeAsync).toHaveBeenCalledWith('Vijay Nagar, Indore, India');
  });

  test('shows the pin and lets the host remove it', async () => {
    const onChange = await setup({ lat: '22.75', lng: '75.89' });
    expect(screen.getByText('22.75000, 75.89000')).toBeTruthy();
    await fireEvent.press(screen.getByText('Remove'));
    expect(onChange).toHaveBeenCalledWith('', '');
  });

  test('flags half-entered coordinates', async () => {
    await setup({ lat: '22.75', lng: '' });
    expect(screen.getByText(/Enter both latitude and longitude/)).toBeTruthy();
  });
});
