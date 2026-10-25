import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ForgotPasswordScreen, ReportScreen } from '../src/screens/ActionScreens';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import { StatusPill } from '../src/components/ui';

const mockNav = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), popToTop: jest.fn(), canGoBack: () => true, setOptions: jest.fn(), getParent: () => null };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
}));

const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('screens', () => {
  let alertSpy: jest.SpyInstance;
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    fetchMock = jest.spyOn(global, 'fetch');
    jest.clearAllMocks();
  });
  afterEach(() => { alertSpy.mockRestore(); fetchMock.mockRestore(); });

  test('StatusPill shows a friendly label', async () => {
    await render(<StatusPill status="pending_review" />);
    expect(screen.getByText('In review')).toBeTruthy();
  });

  test('forgot password validates and then calls the API', async () => {
    fetchMock.mockImplementation(() => json(200, { message: 'If an account exists for that email, a reset link has been sent.' }));
    await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByLabelText('Send reset link'));
    expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.press(screen.getByLabelText('Send reset link'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Check your email', expect.stringContaining('reset link'), expect.any(Array)));
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/auth/forgot-password');
  });

  test('report requires a reason and sends the right payload', async () => {
    mockParams = { targetType: 'listing', targetId: 'p1', label: 'Test PG' };
    fetchMock.mockImplementation(() => json(201, { report: { id: 'r1' } }));
    await render(<ReportScreen />);
    await fireEvent.press(screen.getByLabelText('Submit report'));
    expect(screen.getByText('Please choose a reason')).toBeTruthy();
    await fireEvent.press(screen.getByText("It's fake or doesn't exist"));
    await fireEvent.press(screen.getByLabelText('Submit report'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ targetType: 'listing', targetId: 'p1', reason: 'fake_listing', details: '' });
  });

  test('sign-up blocks weak passwords and missing consent', async () => {
    fetchMock.mockImplementation(() => json(200, []));
    await render(<AuthProvider><RegisterScreen /></AuthProvider>);
    await fireEvent.changeText(screen.getByPlaceholderText('Your full name'), 'Asha');
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'asha@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('8+ characters, letters and numbers'), 'weak');
    await fireEvent.press(screen.getByText('Create Account'));
    expect(alertSpy).toHaveBeenLastCalledWith('Error', 'Password must be at least 8 characters');
    await fireEvent.changeText(screen.getByPlaceholderText('8+ characters, letters and numbers'), 'Strong123');
    await fireEvent.press(screen.getByText('Create Account'));
    expect(alertSpy).toHaveBeenLastCalledWith('Error', 'Please accept the Terms of Service and Privacy Policy');
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/auth/register'))).toBe(false);
  });
});
