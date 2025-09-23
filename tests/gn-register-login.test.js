const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth');
const sequelize = require('../src/sequelize');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('GN Register & Login API', () => {
  let email = '';
  const password = '123456';

  it('should register gn successfully', async () => {
    email = `gn${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, role: 'gn' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', email);
    expect(res.body).toHaveProperty('role', 'gn');
  });

  it('should login gn with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'gn');
  });
});
