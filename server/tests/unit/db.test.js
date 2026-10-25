const dns = require('dns');
const mongoose = require('mongoose');
const { connectMongo, isSrvLookupError } = require('../../src/config/db');

describe('MongoDB connection fallback', () => {
  afterEach(() => jest.restoreAllMocks());

  test('recognises SRV lookup failures', () => {
    expect(isSrvLookupError(new Error('querySrv ECONNREFUSED _mongodb._tcp.x.mongodb.net'))).toBe(true);
    expect(isSrvLookupError(new Error('bad auth : authentication failed'))).toBe(false);
  });

  test('retries once with public DNS when the SRV lookup fails', async () => {
    const setServers = jest.spyOn(dns, 'setServers').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const connect = jest.spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(Object.assign(new Error('querySrv ECONNREFUSED _mongodb._tcp.x.mongodb.net'), { syscall: 'querySrv' }))
      .mockResolvedValueOnce('connected');
    await expect(connectMongo('mongodb+srv://x')).resolves.toBe('connected');
    expect(setServers).toHaveBeenCalledWith(['8.8.8.8', '1.1.1.1']);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  test('does not retry other errors', async () => {
    const connect = jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(new Error('bad auth'));
    await expect(connectMongo('mongodb+srv://x')).rejects.toThrow('bad auth');
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
