import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import { MessagesPage } from '../pages/MessagesPage';

const me = { id: 'me1', fullName: 'Asha', email: 'a@x.com', role: 'tenant', emailVerified: true };
const thread = (messages: unknown[] = []) => ({
  messages, hasMore: false,
  participant: { id: 'u2', fullName: 'Host Ravi', avatar: '', role: 'owner', deleted: false, suspended: false },
  property: { id: 'p1', title: 'Sunrise PG', photo: '' }, blockedByMe: false, blockedMe: false,
});

function setup(onSend: (body: any, attempt: number) => [number, unknown]) {
  localStorage.setItem('drisya_token', 'T');
  window.location.hash = '#/messages?with=u2&property=p1';
  const sends: any[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    let res: [number, unknown] = [200, []];
    if (url.includes('/auth/me')) res = [200, { user: me }];
    else if (url.includes('/messages/conversations')) res = [200, { conversations: [] }];
    else if (url.includes('/messages/thread')) res = [200, thread()];
    else if (url.endsWith('/messages') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      sends.push(body);
      res = onSend(body, sends.length);
    } else if (url.includes('/notifications')) res = [200, { notifications: [], unreadCount: 0, total: 0, pages: 1 }];
    else if (url.includes('/favorites/ids')) res = [200, { ids: [] }];
    if (res[0] === 0) throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(res[1]), { status: res[0], headers: { 'Content-Type': 'application/json' } });
  });
  render(<AppProvider><MessagesPage /></AppProvider>);
  return sends;
}

describe('MessagesPage', () => {
  test('a failed send can be retried and reuses the same clientId', async () => {
    // The first try and the automatic wake-up retry both fail; the user's Retry succeeds.
    const sends = setup((body, n) => (n <= 2 ? [0, null] : [201, { message: { _id: 'm1', text: body.text, createdAt: new Date().toISOString(), read: false } }]));
    const box = await screen.findByLabelText('Message');
    await userEvent.type(box, 'Is a room free?{Enter}');
    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(screen.queryByText('Not sent')).toBeNull());
    expect(sends).toHaveLength(3);
    expect(sends[0].clientId).toBeTruthy();
    expect(new Set(sends.map((x) => x.clientId)).size).toBe(1); // every attempt is the same message
    expect(sends[0]).toMatchObject({ receiverId: 'u2', propertyId: 'p1', text: 'Is a room free?' });
  });

  test('shows a safety tip when contact details are shared, without blocking the message', async () => {
    setup((body) => [201, { message: { _id: 'm2', text: body.text, createdAt: new Date().toISOString(), read: false }, warning: 'contact_info' }]);
    await userEvent.type(await screen.findByLabelText('Message'), 'call 9876543210{Enter}');
    expect(await screen.findByText(/contact details were shared/)).toBeInTheDocument();
    expect(screen.getByText('call 9876543210')).toBeInTheDocument();
  });

  test('message text is rendered as text, not HTML', async () => {
    setup((body) => [201, { message: { _id: 'm3', text: body.text, createdAt: new Date().toISOString(), read: false } }]);
    await userEvent.type(await screen.findByLabelText('Message'), '<img src=x onerror=alert(1)>{Enter}');
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });
});
