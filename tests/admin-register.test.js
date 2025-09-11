const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Admin Register API', () => {
  it('should register admin (lan) successfully', async () => {
    const email = `lan${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', role: 'lan' });
    console.log('register response:', res.body); // เพิ่ม log เพื่อ debug
    if (res.statusCode !== 201) {
      throw new Error(`API response: ${JSON.stringify(res.body)}`);
    }
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', email);
    expect(res.body).toHaveProperty('role', 'lan');
  });
});
