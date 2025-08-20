const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Lan Login API', () => {
  let email = '';
  const password = '123456';

  beforeAll(async () => {
    // สมัคร user lan ก่อน
    email = `lan${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password, role: 'lan' });
  });

  it('should login lan with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'lan');
  });
});
