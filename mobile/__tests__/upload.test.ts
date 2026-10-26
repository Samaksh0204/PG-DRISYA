// Uploads must not use `fetch`: Expo's fetch rejects React Native `{ uri }` FormData
// parts, which made every photo upload fail on devices. They go through XHR instead.
import { setToken, uploadImages, clearToken, __resetTokenCache } from '../src/services/api';

type Fake = { open: jest.Mock; setRequestHeader: jest.Mock; send: jest.Mock; status: number; responseText: string; timeout: number; onload?: () => void; onerror?: () => void; ontimeout?: () => void };
let last: Fake;
let respond: (x: Fake) => void;

beforeEach(async () => {
  await clearToken();
  __resetTokenCache();
  (global as any).XMLHttpRequest = jest.fn(() => {
    last = { open: jest.fn(), setRequestHeader: jest.fn(), send: jest.fn(() => setTimeout(() => respond(last), 0)), status: 0, responseText: '', timeout: 0 };
    return last;
  });
});

test('sends the photo as multipart via XHR with the session token', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  await setToken('T1');
  respond = (x) => { x.status = 200; x.responseText = JSON.stringify({ urls: ['https://res.cloudinary.com/x.jpg'] }); x.onload!(); };
  const urls = await uploadImages([{ uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg' }]);
  expect(urls).toEqual(['https://res.cloudinary.com/x.jpg']);
  expect(last.open).toHaveBeenCalledWith('POST', 'https://api.test/api/upload');
  expect(last.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer T1');
  expect(last.send.mock.calls[0][0]).toBeInstanceOf(FormData);
  expect(last.timeout).toBe(60000);
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

test("shows the server's reason when the upload is rejected", async () => {
  respond = (x) => { x.status = 400; x.responseText = JSON.stringify({ message: 'Image must be smaller than 5MB' }); x.onload!(); };
  await expect(uploadImages([{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }])).rejects.toMatchObject({ message: 'Image must be smaller than 5MB', status: 400 });
});

test('network failure and timeout give clear messages', async () => {
  respond = (x) => x.onerror!();
  await expect(uploadImages([{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }])).rejects.toThrow(/Check your connection/);
  respond = (x) => x.ontimeout!();
  await expect(uploadImages([{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }])).rejects.toThrow(/timed out/);
});
