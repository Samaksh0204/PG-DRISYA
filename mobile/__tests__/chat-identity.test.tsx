import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ChatScreen } from '../src/screens/InboxScreens';
import { AadhaarScreen } from '../src/screens/AadhaarScreen';

const mockNav = { goBack: jest.fn(), navigate: jest.fn(), setOptions: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNav,
    useRoute: () => ({ params: mockParams }),
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
  };
});
jest.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 64 }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const thread = { messages: [], hasMore: false, participant: { id: 'u2', fullName: 'Host Ravi', avatar: '', role: 'owner', deleted: false, suspended: false }, property: { id: 'p1', title: 'Sunrise PG', photo: '' }, blockedByMe: false, blockedMe: false };

describe('chat', () => {
  let fetchMock: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    mockParams = { participantId: 'u2', participantName: 'Host Ravi', propertyId: 'p1', propertyTitle: 'Sunrise PG' };
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => { fetchMock.mockRestore(); alertSpy.mockRestore(); });

  test('a failed send keeps the message and retrying reuses its clientId', async () => {
    const sends: any[] = [];
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url: any, init: any) => {
      if (String(url).includes('/messages/thread')) return json(200, thread);
      if (String(url).endsWith('/messages') && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        sends.push(body);
        if (sends.length === 1) return Promise.reject(new TypeError('Network request failed'));
        return json(201, { message: { _id: 'm1', text: body.text, createdAt: new Date().toISOString(), read: false } });
      }
      return json(200, {});
    });
    await render(<AuthProvider><ChatScreen /></AuthProvider>);
    await fireEvent.changeText(await screen.findByLabelText('Message'), 'Is a room free?');
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(await screen.findByText('Not sent · tap to retry')).toBeTruthy();
    expect(screen.getByText(/offline/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Is a room free?'));
    const retry = alertSpy.mock.calls.at(-1)[2].find((b: any) => b.text === 'Retry');
    await retry.onPress();
    await waitFor(() => expect(screen.queryByText('Not sent · tap to retry')).toBeNull());
    expect(sends).toHaveLength(2);
    expect(sends[1].clientId).toBe(sends[0].clientId);
    expect(sends[0]).toMatchObject({ receiverId: 'u2', propertyId: 'p1', text: 'Is a room free?' });
  });

  test('shows a safety tip when contact details are shared', async () => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url: any, init: any) => {
      if (String(url).includes('/messages/thread')) return json(200, thread);
      if (init?.method === 'POST') return json(201, { message: { _id: 'm2', text: 'call 9876543210', createdAt: new Date().toISOString() }, warning: 'contact_info' });
      return json(200, {});
    });
    await render(<AuthProvider><ChatScreen /></AuthProvider>);
    await fireEvent.changeText(await screen.findByLabelText('Message'), 'call 9876543210');
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(await screen.findByText(/contact details were shared/)).toBeTruthy();
  });
});

describe('identity verification', () => {
  let fetchMock: jest.SpyInstance;
  afterEach(() => fetchMock.mockRestore());

  test('says "unavailable" honestly and offers no fake verify button', async () => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => json(200, { status: 'unverified', available: false, verifiedAt: null, latestAttempt: null }));
    await render(<AuthProvider><AadhaarScreen /></AuthProvider>);
    expect(await screen.findByText('Verification unavailable')).toBeTruthy();
    expect(screen.queryByLabelText('Verify my identity')).toBeNull();
  });

  test('shows the provider step when a provider is configured', async () => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => json(200, { status: 'unverified', available: true, verifiedAt: null, latestAttempt: null }));
    await render(<AuthProvider><AadhaarScreen /></AuthProvider>);
    expect(await screen.findByLabelText('Verify my identity')).toBeTruthy();
    expect(screen.queryByLabelText(/Aadhaar number/)).toBeNull();
  });
});
