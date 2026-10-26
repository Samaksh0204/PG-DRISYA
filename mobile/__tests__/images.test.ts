// Photos are resized (longest edge 1600px) and re-encoded as JPEG before upload,
// because full-size phone photos exceed the server's 5 MB limit.
const mockResize = jest.fn();
const mockSaveAsync = jest.fn(async () => ({ uri: 'file:///cache/out.jpg', width: 0, height: 0 }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({ resize: mockResize, renderAsync: async () => ({ saveAsync: mockSaveAsync }) }),
  },
}));

import { prepareForUpload } from '../src/utils/images';

beforeEach(() => { mockResize.mockClear(); mockSaveAsync.mockClear(); });

test('large landscape and portrait photos are scaled to 1600px on the long edge', async () => {
  await prepareForUpload([{ uri: 'a', width: 4000, height: 3000 }, { uri: 'b', width: 3000, height: 4000 }]);
  expect(mockResize.mock.calls).toEqual([[{ width: 1600 }], [{ height: 1600 }]]);
  expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg' });
});

test('small photos are not upscaled, and HEIC names become .jpg', async () => {
  const [f] = await prepareForUpload([{ uri: 'c', width: 800, height: 600, fileName: 'IMG_0001.HEIC' }]);
  expect(mockResize).not.toHaveBeenCalled();
  expect(f).toEqual({ uri: 'file:///cache/out.jpg', name: 'IMG_0001.jpg', type: 'image/jpeg' });
});
