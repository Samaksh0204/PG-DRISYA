import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import { StarInput, StatusPill, Stars, ErrorBoundary, SafeImage } from '../components/ui';
import { ListingCard } from '../components/ListingCard';
import { LoginPage } from '../pages/LoginPage';
import { resolveRoute } from '../App';
import { mapProperty } from '../lib/api';

// Every component under AppProvider fetches cities on mount; answer all requests with JSON.
function mockApi(handler: (url: string, init?: RequestInit) => [number, unknown] = () => [200, []]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const [status, body] = handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
}

const listing = mapProperty({ _id: 'p1', title: 'Sunrise PG', city: 'Indore', locality: 'Palasia', price: 8500, deposit: 10000, photos: ['https://x/a.jpg', 'https://x/b.jpg'], genderPreference: 'female', occupancy: 'double', rating: 4.5, reviewCount: 2, instantBook: true, verified: true, status: 'active' });

describe('ui primitives', () => {
  test('StarInput reports the chosen value', async () => {
    const onChange = vi.fn();
    render(<StarInput value={0} onChange={onChange} label="Rating" />);
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('StatusPill shows friendly labels', () => {
    render(<><StatusPill status="pending_review" /><StatusPill status="inactive" /><StatusPill status="accepted" /></>);
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
  });

  test('Stars has an accessible label', () => {
    render(<Stars value={3.6} />);
    expect(screen.getByLabelText('3.6 out of 5 stars')).toBeInTheDocument();
  });

  test('SafeImage falls back when the image is broken', () => {
    render(<SafeImage src="https://broken/x.jpg" alt="Indore" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByLabelText('Indore')).toHaveTextContent('I');
  });

  test('ErrorBoundary shows a recovery screen instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => { throw new Error('boom'); };
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('ListingCard', () => {
  test('shows price with ₹, badges, and opens the listing', async () => {
    mockApi();
    render(<AppProvider><ListingCard listing={listing} /></AppProvider>);
    expect(screen.getByText('₹8,500')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Instant Book')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Sunrise PG'));
    expect(window.location.hash).toBe('#/listing/p1');
  });

  test('saving while logged out sends the guest to log in', async () => {
    mockApi();
    render(<AppProvider><ListingCard listing={listing} /></AppProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Save to wishlist' }));
    expect(window.location.hash).toBe('#/login');
  });

  test('paused listings are marked unavailable', () => {
    mockApi();
    render(<AppProvider><ListingCard listing={{ ...listing, status: 'inactive' }} /></AppProvider>);
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  test('validates before calling the server', async () => {
    const f = mockApi();
    render(<AppProvider><LoginPage /></AppProvider>);
    await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /Log in/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid email');
    expect(f.mock.calls.some(([u]) => String(u).includes('/auth/login'))).toBe(false);
  });

  test('sign-up requires accepting the terms and a strong password', async () => {
    mockApi();
    render(<AppProvider><LoginPage /></AppProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await userEvent.type(screen.getByLabelText('Full name'), 'Asha');
    await userEvent.type(screen.getByLabelText('Email address'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'weak');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('8 characters');
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'Strong123');
    await userEvent.click(screen.getByRole('button', { name: /Create account/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Terms of Service');
  });

  test('shows the server error on wrong password', async () => {
    mockApi((url) => (url.includes('/auth/login') ? [401, { message: 'Invalid email or password' }] : [200, []]));
    render(<AppProvider><LoginPage /></AppProvider>);
    await userEvent.type(screen.getByLabelText('Email address'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: /Log in/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'));
  });

  test('successful login stores the token and redirects by role', async () => {
    const user = { id: 'u1', fullName: 'Owner One', email: 'o@x.com', role: 'owner', avatar: '', emailVerified: true };
    mockApi((url) => {
      if (url.includes('/auth/login')) return [200, { token: 'T1', user }];
      if (url.includes('/auth/me')) return [200, { user }];
      if (url.includes('/favorites/ids')) return [200, { ids: [] }];
      if (url.includes('/notifications')) return [200, { notifications: [], unreadCount: 0, total: 0, pages: 0 }];
      return [200, []];
    });
    render(<AppProvider><LoginPage /></AppProvider>);
    await userEvent.type(screen.getByLabelText('Email address'), 'o@x.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: /Log in/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/owner'));
    expect(localStorage.getItem('drisya_token')).toBe('T1');
  });
});

describe('routing', () => {
  test('known, dynamic and unknown routes', () => {
    expect(resolveRoute('/privacy').title).toBe('Privacy Policy');
    expect(resolveRoute('/listing/abc').title).toBe('PG details');
    expect(resolveRoute('/user/abc').title).toBe('Profile');
    expect(resolveRoute('/nope').title).toBe('Not found');
  });
});
