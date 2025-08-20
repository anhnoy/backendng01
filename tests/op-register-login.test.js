const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('OP Register & Login API', () => {
  let email = '';
  const password = '123456';

  it('should register op successfully', async () => {
    email = `op${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, role: 'op' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', email);
    expect(res.body).toHaveProperty('role', 'op');
  });

  it('should login op with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'op');
  });
});
