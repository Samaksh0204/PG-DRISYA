const { api, connect, disconnect } = require('../helpers');
const { seed } = require('../../src/seed/seed');
const Property = require('../../src/models/Property');

beforeAll(() => connect('seed'));
afterAll(disconnect);

test('seed creates consistent demo data whose ratings come from real reviews', async () => {
  const { properties } = await seed({ disconnect: false });
  expect(properties).toHaveLength(6);
  const sunshine = await Property.findById(properties[0]._id);
  expect(sunshine).toMatchObject({ rating: 4.5, reviewCount: 2 });
  expect((await api().get('/api/properties')).body.total).toBe(5); // pending one hidden

  const login = await api().post('/api/auth/login').send({ email: 'admin@example.com', password: 'password123' });
  expect(login.body.user.role).toBe('admin');
  const queue = await api().get('/api/admin/listings').set('Authorization', `Bearer ${login.body.token}`);
  expect(queue.body.total).toBe(1);
});

test('seed refuses to run in production without ALLOW_SEED', async () => {
  process.env.NODE_ENV = 'production';
  try {
    await expect(seed({ disconnect: false })).rejects.toThrow(/Refusing to seed/);
  } finally {
    process.env.NODE_ENV = 'test';
  }
});
